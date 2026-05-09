-- migration_product_delete_safety.sql
-- 商品ソフト削除のレースコンディション対策
--
-- 問題:
--   admin が商品を削除（deleted_at = now()）した瞬間と、buyer が注文を確定する瞬間が
--   重なった場合、以下の race が起きる:
--     t1: buyer の createOrder が products を SELECT（deleted_at IS NULL でヒット）
--     t2: admin が UPDATE deleted_at = now()
--     t3: buyer が order_items INSERT → 削除済商品の架空注文成立
--   アプリ側の WHERE deleted_at IS NULL では TOCTOU を完全には防げない。
--
-- 対策:
--   order_items への BEFORE INSERT トリガーで、参照先 product の deleted_at を
--   毎回チェックし、削除済なら例外を上げる。
--   SECURITY DEFINER で RLS をバイパス → 呼び出し元が buyer でも products の deleted_at を確実に読める。
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_order_items_for_deleted_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.products
    WHERE id = NEW.product_id AND deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'product is archived: %', NEW.product_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_order_items_for_deleted_product()
  IS '削除済商品 (deleted_at IS NOT NULL) への order_items INSERT を阻止。レース対策。SECURITY DEFINER で RLS バイパス。';

DROP TRIGGER IF EXISTS tr_prevent_order_items_for_deleted_product ON public.order_items;
CREATE TRIGGER tr_prevent_order_items_for_deleted_product
  BEFORE INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_order_items_for_deleted_product();

NOTIFY pgrst, 'reload schema';
