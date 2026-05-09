-- migration_product_soft_delete.sql
-- 商品のソフトデリート対応
--
-- 背景:
--   order_items.product_id が ON DELETE RESTRICT で products を参照するため、
--   注文が 1 件でもある商品は DELETE が失敗する。
--   注文履歴・請求書を保持しつつ「商品台帳・買い手カタログから消す」運用にする。
--
-- 動作:
--   Server Action 側で order_items の参照有無をチェックし、
--   - 参照なし → DELETE FROM products（従来通り）
--   - 参照あり → UPDATE products SET deleted_at = now()（ソフト削除）
--   一覧系クエリは WHERE deleted_at IS NULL で除外。
--
-- 適用方法:
--   Supabase Dashboard → SQL Editor で実行。べき等。
-- ============================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.products.deleted_at
  IS 'NULL=有効、値あり=ソフト削除日時（注文履歴保持のため物理削除しない）';

-- 部分インデックス（active 商品への WHERE deleted_at IS NULL クエリを高速化）
CREATE INDEX IF NOT EXISTS idx_products_active_created
  ON public.products (created_at DESC)
  WHERE deleted_at IS NULL;

-- PostgREST のスキーマキャッシュをリロード
-- ALTER 後にこれを打たないと PostgREST 経由のクエリで「column does not exist」エラーが出る
NOTIFY pgrst, 'reload schema';
