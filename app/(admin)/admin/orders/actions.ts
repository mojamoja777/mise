"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

export async function advanceOrderStatus(orderId: string, currentStatus: string) {
  if (currentStatus !== "pending") return { error: "承認できるのは受付中の発注のみです。" };

  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const { error } = await auth.supabase
    .from("orders")
    .update({ status: "confirmed" })
    .eq("id", orderId);

  if (error) return { error: "ステータスの更新に失敗しました。" };

  revalidatePath("/admin");
  revalidatePath("/admin/orders/" + orderId);
}

export async function cancelOrder(orderId: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  // 割り当て確定中の注文を admin が cancel できると confirm_product_allocations と競合するため
  // status は事前にチェックする
  const { data: order } = await auth.supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();
  if (!order) return { error: "発注が見つかりません。" };
  if (order.status === "cancelled") return { error: "既にキャンセル済みです。" };

  const { error } = await auth.supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId);

  if (error) return { error: "キャンセルに失敗しました。" };

  revalidatePath("/admin");
  revalidatePath("/admin/orders/" + orderId);
}

export async function deleteOrder(orderId: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  // order_itemsを先に削除（外部キー制約）
  const { error: itemsError } = await auth.supabase
    .from("order_items")
    .delete()
    .eq("order_id", orderId);

  if (itemsError) return { error: "発注明細の削除に失敗しました。" };

  const { error } = await auth.supabase
    .from("orders")
    .delete()
    .eq("id", orderId);

  if (error) return { error: "発注の削除に失敗しました。" };

  revalidatePath("/admin");
}
