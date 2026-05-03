-- ============================================================
-- Mise チャット機能マイグレーション
-- 作成日: 2026-05-04
-- 目的:
--   - admin ↔ buyer の 1 対 1 チャットを実装
--   - スレッドは (tenant_id, buyer_id) の組で特定（threads テーブル不要）
--   - 既読位置：admin は per-buyer、buyer は単一なので users カラムに格納
-- 前提: tenants / users が存在
-- ============================================================


-- ============================================================
-- 1. users に buyer の既読位置を追加
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_chat_seen_at timestamptz;

COMMENT ON COLUMN public.users.last_chat_seen_at IS
  'buyer がチャットを最後に開いた時刻。未読バッジ算出に使用';


-- ============================================================
-- 2. chat_messages テーブル
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  buyer_id    uuid        NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  sender_id   uuid        NOT NULL REFERENCES public.users(id)   ON DELETE SET NULL,
  sender_role text        NOT NULL CHECK (sender_role IN ('admin', 'buyer')),
  body        text        NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  edited_at   timestamptz,
  deleted_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.chat_messages              IS '1on1チャット（admin↔buyer）のメッセージ本体';
COMMENT ON COLUMN public.chat_messages.tenant_id    IS '所属テナント';
COMMENT ON COLUMN public.chat_messages.buyer_id     IS '会話相手の buyer。adminスレッドの識別キー';
COMMENT ON COLUMN public.chat_messages.sender_id    IS '送信者の users.id';
COMMENT ON COLUMN public.chat_messages.sender_role  IS 'admin / buyer のどちらから送られたか';
COMMENT ON COLUMN public.chat_messages.deleted_at   IS 'NOT NULL ならソフト削除（本文は墓石としてマスク表示）';

-- スレッド（tenant_id, buyer_id）ごとに新着順で取得するためのインデックス
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread
  ON public.chat_messages (tenant_id, buyer_id, created_at DESC);


-- ============================================================
-- 3. chat_read_states テーブル（admin 側の既読位置）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_read_states (
  admin_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  buyer_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (admin_id, buyer_id)
);

COMMENT ON TABLE public.chat_read_states IS
  'admin が buyer ごとに最後にスレッドを開いた時刻。未読バッジ算出に使用';


-- ============================================================
-- 4. RLS
-- ============================================================

ALTER TABLE public.chat_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_read_states ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- 4-1. chat_messages
--   - admin: 自テナントの全メッセージを SELECT/INSERT 可能
--   - buyer: 自分が会話相手 (buyer_id = auth.uid()) の SELECT/INSERT 可能
--   - 編集・削除（UPDATE）：sender_id = auth.uid() のメッセージのみ
-- ----------------------------------------------------------

DROP POLICY IF EXISTS "admin_chat_messages_select" ON public.chat_messages;
CREATE POLICY "admin_chat_messages_select" ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
    AND tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_chat_messages_insert" ON public.chat_messages;
CREATE POLICY "admin_chat_messages_insert" ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'admin'
    AND sender_role = 'admin'
    AND sender_id = auth.uid()
    AND tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "buyer_chat_messages_select" ON public.chat_messages;
CREATE POLICY "buyer_chat_messages_select" ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'buyer'
    AND buyer_id = auth.uid()
  );

DROP POLICY IF EXISTS "buyer_chat_messages_insert" ON public.chat_messages;
CREATE POLICY "buyer_chat_messages_insert" ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() = 'buyer'
    AND buyer_id = auth.uid()
    AND sender_role = 'buyer'
    AND sender_id = auth.uid()
  );

-- 編集・削除は両ロールとも自分のメッセージのみ
DROP POLICY IF EXISTS "chat_messages_update_own" ON public.chat_messages;
CREATE POLICY "chat_messages_update_own" ON public.chat_messages
  FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- ----------------------------------------------------------
-- 4-2. chat_read_states
--   - admin が自分自身の既読状態を読み書き
-- ----------------------------------------------------------

DROP POLICY IF EXISTS "admin_chat_read_states_all" ON public.chat_read_states;
CREATE POLICY "admin_chat_read_states_all" ON public.chat_read_states
  FOR ALL
  TO authenticated
  USING (
    public.current_user_role() = 'admin'
    AND admin_id = auth.uid()
  )
  WITH CHECK (
    public.current_user_role() = 'admin'
    AND admin_id = auth.uid()
  );


-- ============================================================
-- 5. Supabase Realtime 配信を有効化
-- ============================================================
-- Realtime は publication supabase_realtime にテーブルを追加する形で有効化
-- 同名 publication が無ければ作成する

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- chat_messages を publication に追加（既に追加済みなら NO-OP）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;


-- ============================================================
-- 6. admin 用：buyer ごとの最終メッセージ・未読数を 1 クエリで返す関数
-- ============================================================
-- VIEW でも書けるが LATERAL JOIN を SECURITY INVOKER の関数にしておくと
-- RLS が効きつつ N+1 を回避できる
-- ============================================================

CREATE OR REPLACE FUNCTION public.list_admin_chat_threads(p_admin_id uuid)
RETURNS TABLE (
  buyer_id        uuid,
  company_name    text,
  customer_code   text,
  is_active       boolean,
  last_body       text,
  last_sender_role text,
  last_created_at timestamptz,
  last_deleted_at timestamptz,
  unread_count    integer
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  WITH me AS (
    SELECT id, tenant_id FROM public.users WHERE id = p_admin_id
  )
  SELECT
    b.id            AS buyer_id,
    b.company_name,
    b.customer_code,
    b.is_active,
    last_msg.body            AS last_body,
    last_msg.sender_role     AS last_sender_role,
    last_msg.created_at      AS last_created_at,
    last_msg.deleted_at      AS last_deleted_at,
    COALESCE(unread.cnt, 0)::int AS unread_count
  FROM public.users b
  CROSS JOIN me
  LEFT JOIN LATERAL (
    SELECT body, sender_role, created_at, deleted_at
    FROM public.chat_messages m
    WHERE m.tenant_id = me.tenant_id AND m.buyer_id = b.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) last_msg ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt
    FROM public.chat_messages m
    LEFT JOIN public.chat_read_states r
      ON r.admin_id = me.id AND r.buyer_id = b.id
    WHERE m.tenant_id = me.tenant_id
      AND m.buyer_id  = b.id
      AND m.sender_role = 'buyer'
      AND m.deleted_at IS NULL
      AND m.created_at > COALESCE(r.last_read_at, 'epoch'::timestamptz)
  ) unread ON true
  WHERE b.role = 'buyer'
    AND b.tenant_id = me.tenant_id
  ORDER BY last_msg.created_at DESC NULLS LAST, b.company_name ASC;
$$;

COMMENT ON FUNCTION public.list_admin_chat_threads IS
  'admin のチャット左ペイン用：buyer ごとに最終メッセージと未読件数を返す';

GRANT EXECUTE ON FUNCTION public.list_admin_chat_threads(uuid) TO authenticated;


-- ============================================================
-- 完了確認
--   SELECT * FROM public.list_admin_chat_threads(<admin_user_uuid>);
--   SELECT * FROM public.chat_messages ORDER BY created_at DESC LIMIT 10;
-- ============================================================
