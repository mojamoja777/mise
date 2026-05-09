// app/(admin)/admin/orders/page.tsx
// 管理者 - 注文一覧（フル）。ダッシュボードの抜粋と同じテーブル構造で、
// 件数制限なし + ステータスフィルタ + 期間絞り込みは将来追加。

import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { OrderFilter } from "@/components/admin/OrderFilter";
import { PlateCorner } from "@/components/ui/PlateCorner";
import { StatusDot } from "@/components/ui/StatusDot";
import { Tag } from "@/components/ui/Tag";
import { Emblem } from "@/components/ui/Emblem";
import { Button } from "@/components/ui/Button";

type Props = {
  searchParams: Promise<{ status?: string }>;
};

const ORDER_STATUSES = ["pending", "confirmed", "cancelled", "allocation_pending"] as const;
type OrderStatus = typeof ORDER_STATUSES[number];

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

function formatTime(date: string) {
  const d = new Date(date);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(
      `
      id,
      status,
      ordered_at,
      users!orders_buyer_id_fkey!inner ( company_name ),
      order_items (
        quantity,
        allocated_quantity,
        unit_price
      )
    `,
    )
    .order("ordered_at", { ascending: false });

  if (status && isOrderStatus(status)) {
    query = query.eq("status", status);
  }

  const { data: orders, error } = await query;

  return (
    <div className="relative px-10 pt-7 pb-10">
      <PlateCorner number="04" />

      <header className="border-b border-rule pb-5 mb-7 flex items-baseline justify-between">
        <div>
          <p className="caps">Plate IV · Orders</p>
          <h1 className="font-serif text-5xl mt-2 tracking-tight">注文一覧</h1>
          <p className="font-italic-serif mt-1 text-base text-ink-3">
            すべての発注（最新順）
          </p>
        </div>
        <Suspense>
          <OrderFilter />
        </Suspense>
      </header>

      {error && (
        <div className="border border-crimson bg-crimson-bg text-crimson text-sm px-4 py-3 mb-4">
          発注の取得に失敗しました。
        </div>
      )}

      {orders && orders.length > 0 ? (
        <table className="w-full">
          <thead>
            <tr className="border-b border-plate">
              <th className="w-8" />
              <th className="text-left py-2.5 caps w-16">時刻</th>
              <th className="text-left py-2.5 caps w-48">差出</th>
              <th className="text-left py-2.5 caps">件名</th>
              <th className="text-right py-2.5 caps w-32">金額</th>
              <th className="w-32" />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const items = (order.order_items ?? []) as Array<{
                unit_price: number;
                quantity: number;
                allocated_quantity: number | null;
              }>;
              const total = items.reduce(
                (s, it) => s + it.unit_price * (it.allocated_quantity ?? it.quantity),
                0,
              );
              const buyer = order.users as { company_name: string } | null;
              const dotVariant: React.ComponentProps<typeof StatusDot>["variant"] =
                order.status === "pending"
                  ? "plate"
                  : order.status === "allocation_pending"
                  ? "amber"
                  : order.status === "cancelled"
                  ? "crimson"
                  : "forest";
              const tagVariant: React.ComponentProps<typeof Tag>["variant"] = dotVariant;
              const tagLabel =
                order.status === "pending"
                  ? "新規発注"
                  : order.status === "allocation_pending"
                  ? "割当待ち"
                  : order.status === "cancelled"
                  ? "キャンセル"
                  : "確定済";
              const isFresh = order.status === "pending";
              const subject = `${buyer?.company_name ?? "—"} · ${items.reduce(
                (s, it) => s + it.quantity,
                0,
              )} 本`;
              return (
                <tr
                  key={order.id}
                  className="border-b border-rule hover:bg-paper-2 transition-colors"
                >
                  <td className="pl-1">
                    <StatusDot variant={dotVariant} pulse={isFresh} />
                  </td>
                  <td className="text-xs font-italic-serif text-ink-3 py-3">
                    {formatTime(order.ordered_at)}
                  </td>
                  <td className="py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="flex items-center gap-3 hover:text-plate"
                    >
                      <Emblem size={28} variant={dotVariant}>
                        {(buyer?.company_name ?? "—").slice(0, 1)}
                      </Emblem>
                      <span className="font-serif tracking-tight">
                        {buyer?.company_name ?? "—"}
                      </span>
                    </Link>
                  </td>
                  <td className="py-3">
                    <Tag variant={tagVariant}>{tagLabel}</Tag>
                    <span className="ml-3 text-sm text-ink-2">{subject}</span>
                  </td>
                  <td className="text-right plate-num text-plate">¥{total.toLocaleString()}</td>
                  <td className="text-right pr-1">
                    <Link href={`/admin/orders/${order.id}`}>
                      <Button variant={isFresh ? "primary" : "default"} size="sm">
                        {isFresh ? "確認 ⏎" : "詳細"}
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="border border-rule bg-paper-2 flex flex-col items-center justify-center py-20 text-ink-3">
          <p className="font-italic-serif text-lg">
            {status ? "該当する発注がありません" : "発注はまだありません"}
          </p>
        </div>
      )}

      <p className="ornament mt-10" />
    </div>
  );
}
