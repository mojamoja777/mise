// app/(buyer)/buyer/orders/[id]/page.tsx
// 発注詳細ページ（発注者向け）

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { BuyerCancelOrderButton } from "@/components/buyer/CancelOrderButton";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      `
      id,
      status,
      note,
      ordered_at,
      order_items (
        id,
        quantity,
        allocated_quantity,
        unit_price,
        products (
          id,
          name,
          producer,
          region,
          is_allocation
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (!order) notFound();

  const isPendingAllocation = order.status === "allocation_pending";
  const total = order.order_items.reduce(
    (sum, item) =>
      sum + item.unit_price * (item.allocated_quantity ?? item.quantity),
    0
  );
  const totalQty = order.order_items.reduce(
    (sum, item) => sum + (item.allocated_quantity ?? item.quantity),
    0
  );

  return (
    <div className="px-4 py-4">
      {/* 戻るボタン */}
      <Link
        href="/buyer/orders"
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#6B1A35] mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        発注履歴へ戻る
      </Link>

      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">発注詳細</h1>
          <p className="text-xs text-gray-400 font-mono">
            #{order.id.slice(0, 8).toUpperCase()}
          </p>
          <p className="text-xs text-gray-400">
            {new Date(order.ordered_at).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* 発注内容 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">発注内容</h2>
        {isPendingAllocation && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            割り当て待ちのため、表示は希望本数です。確定後に金額が確定します。
          </p>
        )}
        <div className="space-y-3">
          {order.order_items.map((item) => {
            const product = item.products as {
              name: string;
              is_allocation?: boolean;
            } | null;
            const finalQty = item.allocated_quantity ?? item.quantity;
            const showRequested =
              isPendingAllocation && product?.is_allocation;
            return (
              <div key={item.id} className="flex justify-between items-start text-sm">
                <div className="flex-1 pr-2">
                  <p className="text-gray-900 font-medium">
                    {product?.name ?? "—"}
                  </p>
                  <p className="text-xs text-gray-400">
                    ¥{item.unit_price.toLocaleString()} ×{" "}
                    {showRequested
                      ? `希望 ${item.quantity}本`
                      : `${finalQty}本`}
                  </p>
                </div>
                <p className="font-semibold text-gray-900 shrink-0">
                  {showRequested
                    ? "—"
                    : `¥${(item.unit_price * finalQty).toLocaleString()}`}
                </p>
              </div>
            );
          })}
        </div>
        <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between">
          <span className="text-sm text-gray-600">
            {isPendingAllocation ? `希望合計 ${totalQty}本` : `合計 ${totalQty}本`}
          </span>
          <span className="text-base font-bold text-[#3B0A1E]">
            {isPendingAllocation ? "—" : `¥${total.toLocaleString()}`}
          </span>
        </div>
      </div>

      {/* 備考 */}
      {order.note && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">備考</h2>
          <p className="text-sm text-gray-600">{order.note}</p>
        </div>
      )}

      {/* キャンセルボタン */}
      <div className="mt-4">
        <BuyerCancelOrderButton orderId={order.id} currentStatus={order.status} />
      </div>

      {order.status === "cancelled" && (
        <div className="bg-red-50 rounded-xl border border-red-200 px-4 py-3 text-sm text-red-600 mt-4">
          この発注はキャンセルされました。
        </div>
      )}
    </div>
  );
}
