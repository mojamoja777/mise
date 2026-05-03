"use server";

import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/mailer";
import { AllocationConfirmedEmail } from "@/lib/email/AllocationConfirmed";
import { getBuyerEmail } from "@/lib/email/recipients";
import { appUrl } from "@/lib/url";

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
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  if (decisions.length === 0) return { error: "更新対象がありません。" };

  for (const d of decisions) {
    if (!Number.isInteger(d.allocatedQuantity) || d.allocatedQuantity < 0) {
      return { error: "配分本数は0以上の整数で入力してください。" };
    }
  }

  // RPC 実行前に「どの buyer がどの希望本数だったか」を捕捉しておく（後でメール送信用）
  type ItemContext = {
    orderItemId: string;
    buyerId: string;
    buyerName: string;
    productName: string;
    requestedQty: number;
  };
  const { data: contextRows } = await auth.supabase
    .from("order_items")
    .select(
      `id, quantity,
       products!inner ( name ),
       orders!inner (
         buyer_id,
         users!orders_buyer_id_fkey!inner ( company_name )
       )`
    )
    .in(
      "id",
      decisions.map((d) => d.orderItemId)
    );
  const contextById = new Map<string, ItemContext>();
  for (const row of contextRows ?? []) {
    const order = row.orders as unknown as {
      buyer_id: string;
      users: { company_name: string } | null;
    } | null;
    const product = row.products as unknown as { name: string } | null;
    if (!order?.buyer_id) continue;
    contextById.set(row.id, {
      orderItemId: row.id,
      buyerId: order.buyer_id,
      buyerName: order.users?.company_name ?? "—",
      productName: product?.name ?? "(商品名不明)",
      requestedQty: row.quantity,
    });
  }

  const { error } = await auth.supabase.rpc("confirm_product_allocations", {
    p_product_id: productId,
    p_decisions: decisions.map((d) => ({
      order_item_id: d.orderItemId,
      allocated_quantity: d.allocatedQuantity,
    })),
    p_admin_id: auth.user.id,
  });

  if (error) {
    // Postgres 関数からの RAISE EXCEPTION メッセージはそのまま表示してよい設計
    return { error: error.message ?? "確定処理に失敗しました。" };
  }

  // buyer ごとに集約してメール送信
  type BuyerBucket = {
    buyerName: string;
    decisions: Array<{
      productName: string;
      requestedQty: number;
      allocatedQty: number;
    }>;
  };
  const buckets = new Map<string, BuyerBucket>();
  for (const d of decisions) {
    const ctx = contextById.get(d.orderItemId);
    if (!ctx) continue;
    const bucket = buckets.get(ctx.buyerId) ?? {
      buyerName: ctx.buyerName,
      decisions: [],
    };
    bucket.decisions.push({
      productName: ctx.productName,
      requestedQty: ctx.requestedQty,
      allocatedQty: d.allocatedQuantity,
    });
    buckets.set(ctx.buyerId, bucket);
  }
  await Promise.all(
    Array.from(buckets.entries()).map(async ([buyerId, bucket]) => {
      const email = await getBuyerEmail(buyerId);
      if (!email) return;
      await sendNotificationEmail({
        to: email,
        subject: "割り当て本数確定のご連絡",
        react: createElement(AllocationConfirmedEmail, {
          buyerName: bucket.buyerName,
          decisions: bucket.decisions,
          buyerUrl: appUrl("/buyer/orders"),
        }),
      });
    })
  );

  revalidatePath("/admin/allocations");
  revalidatePath(`/admin/allocations/${productId}`);
  revalidatePath("/admin");
  // どの注文が影響を受けたかは RPC 側で確定するため、buyer 側も含め広めに revalidate
  revalidatePath("/buyer/orders");

  return { error: null };
}
