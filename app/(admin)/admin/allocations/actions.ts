"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AllocationDecision = {
  orderItemId: string;
  allocatedQuantity: number;
};

type ConfirmResult = { error: string | null };

/**
 * 商品ごとの割り当てを一括確定する。
 * 実体は Postgres 関数 confirm_product_allocations:
 *  - admin 権限チェック
 *  - 商品行 SELECT FOR UPDATE で同時確定レースを防止
 *  - 各明細の希望本数 / 親注文ステータス / 配分本数の検証
 *  - 配分合計が在庫上限を超えないことを検証
 *  - 全明細が確定した注文を 'confirmed' に遷移
 *  - 在庫から配分合計を減算
 * 全てを 1 トランザクションで実行。
 */
export async function confirmAllocations(
  productId: string,
  decisions: AllocationDecision[]
): Promise<ConfirmResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です。" };

  if (decisions.length === 0) return { error: "更新対象がありません。" };

  for (const d of decisions) {
    if (!Number.isInteger(d.allocatedQuantity) || d.allocatedQuantity < 0) {
      return { error: "配分本数は0以上の整数で入力してください。" };
    }
  }

  const { error } = await supabase.rpc("confirm_product_allocations", {
    p_product_id: productId,
    p_decisions: decisions.map((d) => ({
      order_item_id: d.orderItemId,
      allocated_quantity: d.allocatedQuantity,
    })),
    p_admin_id: user.id,
  });

  if (error) {
    // Postgres 関数からの RAISE EXCEPTION メッセージはそのまま表示してよい設計
    return { error: error.message ?? "確定処理に失敗しました。" };
  }

  revalidatePath("/admin/allocations");
  revalidatePath(`/admin/allocations/${productId}`);
  revalidatePath("/admin");
  // どの注文が影響を受けたかは RPC 側で確定するため、buyer 側も含め広めに revalidate
  revalidatePath("/buyer/orders");

  return { error: null };
}
