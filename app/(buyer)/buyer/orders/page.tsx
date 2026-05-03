// app/(buyer)/buyer/orders/page.tsx
// 発注者 - 発注履歴ページ

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/StatusBadge";

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select(
      `
      id,
      status,
      note,
      ordered_at,
      order_items (
        quantity,
        allocated_quantity,
        unit_price
      )
    `
    )
    .order("ordered_at", { ascending: false });

  return (
    <div className="px-4 py-4">
      <h1 className="text-lg font-semibold text-gray-900 mb-4">発注履歴</h1>

      {orders && orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => {
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
            const date = new Date(order.ordered_at);

            return (
              <Link
                key={order.id}
                href={`/buyer/orders/${order.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs text-gray-400 font-mono">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {date.toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="flex justify-between items-end">
                  <p className="text-sm text-gray-600">
                    {isPendingAllocation ? `希望 ${totalQty}本` : `${totalQty}本`}
                  </p>
                  <p className="text-base font-bold text-[#3B0A1E]">
                    {isPendingAllocation ? "—" : `¥${total.toLocaleString()}`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <span className="text-4xl mb-3">📋</span>
          <p className="text-sm mb-6">発注履歴がありません</p>
          <Link
            href="/buyer"
            className="px-6 py-2.5 bg-[#6B1A35] text-white text-sm font-medium rounded-xl hover:bg-[#9B2D50] transition-colors"
          >
            商品一覧へ
          </Link>
        </div>
      )}
    </div>
  );
}
