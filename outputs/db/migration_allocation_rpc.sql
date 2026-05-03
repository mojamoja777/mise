-- ============================================================
-- Mise 割り当て機能：確定処理 RPC
-- 作成日: 2026-05-03
-- 目的:
--   - 割り当て確定処理を 1 トランザクション + advisory lock で実行
--   - サーバ側で stock 上限チェック（クライアント改ざん耐性）
--   - 同一商品を複数 admin が同時確定するレースを防止
-- 前提: migration_allocation.sql が適用済み
-- ============================================================

CREATE OR REPLACE FUNCTION public.confirm_product_allocations(
  p_product_id uuid,
  p_decisions jsonb,        -- [{ "order_item_id": "...", "allocated_quantity": 3 }, ...]
  p_admin_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_stock int;
  v_decision jsonb;
  v_order_item_id uuid;
  v_allocated int;
  v_quantity int;
  v_total_allocated int := 0;
  v_affected_order_ids uuid[];
BEGIN
  -- 権限チェック：呼び出し元が admin であること
  SELECT role INTO v_role FROM public.users WHERE id = p_admin_id;
  IF v_role IS NULL OR v_role <> 'admin' THEN
    RAISE EXCEPTION '権限がありません' USING ERRCODE = '42501';
  END IF;

  -- 商品行をロック（同時確定の防止）
  SELECT stock INTO v_stock
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF v_stock IS NULL THEN
    RAISE EXCEPTION '対象商品が見つかりません' USING ERRCODE = 'P0002';
  END IF;

  -- 各 decision を検証しつつ合計を集計
  FOR v_decision IN SELECT * FROM jsonb_array_elements(p_decisions)
  LOOP
    v_order_item_id := (v_decision->>'order_item_id')::uuid;
    v_allocated := (v_decision->>'allocated_quantity')::int;

    IF v_allocated < 0 THEN
      RAISE EXCEPTION '配分本数は 0 以上である必要があります' USING ERRCODE = '22023';
    END IF;

    -- 対象明細：商品一致 & 親注文が allocation_pending & 未確定
    SELECT oi.quantity INTO v_quantity
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = v_order_item_id
      AND oi.product_id = p_product_id
      AND oi.allocated_quantity IS NULL
      AND o.status = 'allocation_pending';

    IF v_quantity IS NULL THEN
      RAISE EXCEPTION '対象の明細が見つからないか、既に確定済みです (id=%)', v_order_item_id
        USING ERRCODE = 'P0002';
    END IF;

    IF v_allocated > v_quantity THEN
      RAISE EXCEPTION '希望本数を超える配分はできません (希望=%, 配分=%)', v_quantity, v_allocated
        USING ERRCODE = '22023';
    END IF;

    v_total_allocated := v_total_allocated + v_allocated;
  END LOOP;

  -- 在庫上限チェック
  IF v_total_allocated > v_stock THEN
    RAISE EXCEPTION '配分合計 (%) が在庫 (%) を超えています', v_total_allocated, v_stock
      USING ERRCODE = '23514';
  END IF;

  -- 配分本数を反映
  WITH updates AS (
    SELECT
      (d->>'order_item_id')::uuid AS id,
      (d->>'allocated_quantity')::int AS allocated_quantity
    FROM jsonb_array_elements(p_decisions) d
  )
  UPDATE public.order_items oi
  SET allocated_quantity = u.allocated_quantity
  FROM updates u
  WHERE oi.id = u.id;

  -- 影響を受けた注文 ID を回収
  SELECT array_agg(DISTINCT (d->>'order_item_id')::uuid)
  INTO v_affected_order_ids
  FROM jsonb_array_elements(p_decisions) d;

  v_affected_order_ids := (
    SELECT array_agg(DISTINCT order_id)
    FROM public.order_items
    WHERE id = ANY(v_affected_order_ids)
  );

  -- 全明細が確定した注文を 'confirmed' に遷移
  UPDATE public.orders o
  SET status = 'confirmed',
      allocation_decided_at = NOW(),
      allocation_decided_by = p_admin_id
  WHERE o.id = ANY(v_affected_order_ids)
    AND o.status = 'allocation_pending'
    AND NOT EXISTS (
      SELECT 1 FROM public.order_items oi
      WHERE oi.order_id = o.id
        AND oi.allocated_quantity IS NULL
    );

  -- 在庫を確定本数だけ減算（割り当て後に残れば通常販売に回せる）
  UPDATE public.products
  SET stock = stock - v_total_allocated
  WHERE id = p_product_id;
END;
$$;

COMMENT ON FUNCTION public.confirm_product_allocations IS
  '割り当て確定処理：商品行ロック + stock 上限検証 + 注文ステータス更新を 1 トランザクションで実行';

-- 認証済みユーザーから RPC 経由で呼び出せるようにする（関数内で role チェック済み）
GRANT EXECUTE ON FUNCTION public.confirm_product_allocations(uuid, jsonb, uuid)
  TO authenticated;
