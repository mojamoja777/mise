-- ============================================================
-- Mise users · 顧客カルテ拡張 マイグレーション
-- 作成日: 2026-05-09
-- 目的:
--   - buyer（飲食店）に「ティア」「嗜好タグ」「店主メモ」を持たせ、
--     チャット右ペインや割当画面で活用する。
-- 前提:
--   migration_users_extend.sql / migration_tenants.sql が完了済み
-- ============================================================

-- ティア（gold / silver / bronze）。デフォルトは bronze。
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'bronze'
    CHECK (tier IN ('gold', 'silver', 'bronze'));

COMMENT ON COLUMN public.users.tier IS
  '飲食店のティア。割当の優先度算出やレコメンドに使う。gold/silver/bronze';

-- 嗜好タグ（"Champagne", "純米大吟醸" など）
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS taste_tags text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.users.taste_tags IS
  '飲食店の嗜好を表すタグ配列。注文履歴から自動学習 + 手入力で追加。';

-- 店主メモ（管理者専用、buyer から見えない）
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS internal_note text;

COMMENT ON COLUMN public.users.internal_note IS
  '店主が買い手について残す内部メモ。buyer 側からは閲覧不可。';

-- ============================================================
-- 集計ビュー: 月次注文金額・件数・最終注文日
--   毎回 GROUP BY を回すよりビューにしておくと管理画面で扱いやすい。
--   重い場合は materialized view + cron に切り替える前提。
-- ============================================================

CREATE OR REPLACE VIEW public.buyer_stats AS
SELECT
  u.id                                                            AS buyer_id,
  u.tenant_id,
  COALESCE(SUM(
    CASE
      WHEN o.status = 'cancelled' THEN 0
      WHEN o.ordered_at >= now() - interval '30 days'
        THEN oi.unit_price * COALESCE(oi.allocated_quantity, oi.quantity)
      ELSE 0
    END
  ), 0)                                                           AS amount_30d,
  COALESCE(SUM(
    CASE
      WHEN o.status = 'cancelled' THEN 0
      ELSE oi.unit_price * COALESCE(oi.allocated_quantity, oi.quantity)
    END
  ), 0)                                                           AS amount_total,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status <> 'cancelled')     AS orders_total,
  MAX(o.ordered_at)                                               AS last_ordered_at
FROM public.users u
LEFT JOIN public.orders      o  ON o.buyer_id = u.id
LEFT JOIN public.order_items oi ON oi.order_id = o.id
WHERE u.role = 'buyer'
GROUP BY u.id, u.tenant_id;

COMMENT ON VIEW public.buyer_stats IS
  '飲食店ごとの集計。30日売上 / 累計売上 / 累計注文数 / 最終注文日。';

-- 既存の RLS ポリシーがビューに継承されないため、
-- 必要なら SECURITY INVOKER を付ける（PG14+）。
ALTER VIEW public.buyer_stats SET (security_invoker = on);

-- ============================================================
-- 完了確認
-- ============================================================
--   SELECT id, company_name, tier, taste_tags FROM public.users WHERE role = 'buyer';
--   SELECT * FROM public.buyer_stats LIMIT 5;
-- ============================================================
