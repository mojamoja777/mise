import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { PlateCorner, Button } from "@/components/ui";

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
    `,
    )
    .order("ordered_at", { ascending: false });

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto relative">
      <PlateCorner number="06" />

      <header className="mb-6">
        <p className="caps">Plate VI · Orders</p>
        <h1 className="font-serif text-4xl mt-2 tracking-tight">
          発注履歴 <span className="font-italic-serif text-ink-3 text-2xl ml-1">— {orders?.length ?? 0}件</span>
        </h1>
      </header>

      {orders && orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => {
            const isPendingAllocation = order.status === "allocation_pending";
            const total = order.order_items.reduce(
              (sum, item) => sum + item.unit_price * (item.allocated_quantity ?? item.quantity),
              0,
            );
            const totalQty = order.order_items.reduce(
              (sum, item) => sum + (item.allocated_quantity ?? item.quantity),
              0,
            );
            const date = new Date(order.ordered_at);

            return (
              <Link
                key={order.id}
                href={`/buyer/orders/${order.id}`}
                className="block bg-paper border border-rule p-5 hover:border-plate transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="caps font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="font-italic-serif text-sm text-ink-3 mt-1">
                      {date.toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="flex justify-between items-baseline pt-3 border-t border-rule">
                  <p className="text-sm text-ink-2 font-italic-serif">
                    {isPendingAllocation ? `希望 ${totalQty}本` : `${totalQty}本`}
                  </p>
                  <p className="font-serif text-2xl plate-num text-plate">
                    {isPendingAllocation ? "—" : `¥${total.toLocaleString()}`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-paper-2 border border-rule flex flex-col items-center justify-center py-20 text-ink-3">
          <p className="font-italic-serif text-base mb-6">まだ発注履歴がありません</p>
          <Link href="/buyer">
            <Button variant="primary" size="lg">セラーへ戻る →</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
