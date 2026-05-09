-- migration_cart_archive_notifications.sql
-- カート内商品が削除された時の自動チャット通知の dedup 用テーブル
--
-- 背景:
--   admin が商品を削除（deleted_at = now()）した後、その商品をカートに入れていた
--   buyer が次回カート画面を開いた時に「○○ は商品登録が削除されたためカートから
--   削除されました」というチャットメッセージを自動送信したい。
--
--   ただしカート画面は何度も開かれうるため、同じ buyer × product の組み合わせには
--   1 度だけ通知する必要がある。本テーブルで PK (buyer_id, product_id) により
--   送信済みかを判定する。
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cart_archive_notifications (
  buyer_id    uuid        NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  product_id  uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  notified_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (buyer_id, product_id)
);

COMMENT ON TABLE public.cart_archive_notifications
  IS 'カート内商品が削除された時の自動チャット通知の dedup テーブル';

-- RLS: 本テーブルは buyer/admin から直接 SELECT/INSERT する必要は無い
-- （service role 経由でのみアクセスする）。RLS は有効化するが policy を作らないことで
-- authenticated ロールからの全アクセスを禁止する。
ALTER TABLE public.cart_archive_notifications ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
