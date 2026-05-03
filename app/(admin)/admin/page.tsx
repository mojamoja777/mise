// app/(admin)/admin/page.tsx
// 管理者ダッシュボード - 発注一覧

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { OrderFilter } from "@/components/admin/OrderFilter";
import { Suspense } from "react";

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const supabase = await createClient();

  // 発注一覧を取得（buyer の company_name を JOIN）
  let query = supabase
    .from("orders")
    .select(
      `
      id,
      status,
      note,
      ordered_at,
      users!orders_buyer_id_fkey!inner (
        company_name
      ),
      order_items (
        quantity,
        allocated_quantity,
        unit_price
      )
    `
    )
    .order("ordered_at", { ascending: false });

  if (status) {
    const validStatuses = [
      "pending",
      "confirmed",
      "cancelled",
      "allocation_pending",
    ] as const;
    type OrderStatus = typeof validStatuses[number];
    if ((validStatuses as readonly string[]).includes(status)) {
      query = query.eq("status", status as OrderStatus);
    }
  }

  const { data: orders, error } = await query;

  return (
    <div className="p-8">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">発注一覧</h1>
        <Suspense>
          <OrderFilter />
        </Suspense>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
          発注の取得に失敗しました。
        </div>
      )}

      {orders && orders.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  発注番号
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  顧客名
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  合計
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
                  状態
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  日時
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => {
                const total = order.order_items.reduce(
                  (sum, item) =>
                    sum + item.unit_price * (item.allocated_quantity ?? item.quantity),
                  0
                );
                const buyer = order.users as { company_name: string } | null;

                return (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-mono text-xs text-[#6B1A35] hover:underline block"
                      >
                        #{order.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-gray-900 hover:text-[#6B1A35] block"
                      >
                        {buyer?.company_name ?? "—"}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-gray-900">
                      ¥{total.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">
                      {new Date(order.ordered_at).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-20 text-gray-400">
          <span className="text-4xl mb-3">📋</span>
          <p className="text-sm">
            {status ? "該当する発注がありません" : "発注がまだありません"}
          </p>
        </div>
      )}
    </div>
  );
}
