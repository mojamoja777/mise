-- migration_buyer_soft_delete.sql
-- 顧客（buyer）のソフト削除対応
--
-- 背景:
--   buyer は orders / invoices / chat_messages / cart_archive_notifications 等から
--   FK 参照されており、ハード削除は基本不可（ON DELETE RESTRICT or CASCADE）。
--   過去の取引履歴を保持しつつ「削除した」状態を表現するため、users.deleted_at を導入。
--
-- 動作:
--   admin 顧客台帳の表示は WHERE deleted_at IS NULL でフィルタ。
--   削除時は deleted_at = NOW() + Supabase Auth のユーザーを ban して以降ログイン不可に。
--
-- 適用方法:
--   Supabase Dashboard → SQL Editor で実行。べき等。
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.users.deleted_at
  IS 'NULL=有効、値あり=ソフト削除日時。orders/invoices/chat の参照は維持される';

-- 部分インデックス（active な行への WHERE deleted_at IS NULL クエリを高速化）
CREATE INDEX IF NOT EXISTS idx_users_active
  ON public.users (created_at DESC)
  WHERE deleted_at IS NULL;

NOTIFY pgrst, 'reload schema';
