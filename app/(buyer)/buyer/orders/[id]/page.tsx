import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { BuyerCancelOrderButton } from "@/components/buyer/CancelOrderButton";
import { PlateCorner, Tag } from "@/components/ui";

type Props = {
  params: Promise<{ id: string }>;
};

const TIMELINE_STEPS = ["ordered", "deadline", "allocated", "shipped"] as const;

function timelineState(status: string): number {
  if (status === "cancelled") return 0;
  if (status === "pending") return 1;
  if (status === "allocation_pending") return 2;
  if (status === "confirmed") return 3;
  return 1;
}

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
    `,
    )
    .eq("id", id)
    .single();

  if (!order) notFound();

  const isPendingAllocation = order.status === "allocation_pending";
  const total = order.order_items.reduce(
    (sum, item) => sum + item.unit_price * (item.allocated_quantity ?? item.quantity),
    0,
  );
  const totalQty = order.order_items.reduce(
    (sum, item) => sum + (item.allocated_quantity ?? item.quantity),
    0,
  );
  const stepReached = timelineState(order.status);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto relative">
      <PlateCorner number="08" />

      <Link href="/buyer/orders" className="caps inline-flex items-center gap-1 text-ink-3 hover:text-plate mb-4">
        <ChevronLeft className="w-3.5 h-3.5" />
        発注履歴へ戻る
      </Link>

      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="caps">Plate VIII · Order</p>
          <p className="caps font-mono mt-1">#{order.id.slice(0, 8).toUpperCase()}</p>
          <h1 className="font-serif text-5xl plate-num mt-2 text-plate">
            {isPendingAllocation ? "—" : `¥${total.toLocaleString()}`}
          </h1>
          <p className="font-italic-serif text-sm mt-2 text-ink-3">
            {totalQty}本 ·{" "}
            {new Date(order.ordered_at).toLocaleString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            受付
          </p>
        </div>
        <StatusBadge status={order.status} />
      </header>

      {/* Timeline */}
      <div className="grid grid-cols-4 gap-0 double-rule mb-7">
        {TIMELINE_STEPS.map((step, idx) => {
          const reached = idx + 1 <= stepReached;
          const current = idx + 1 === stepReached;
          const labels = ["注文受付", "受付締切待ち", "配分結果", "発送完了"];
          const captions = ["ordered", "deadline", "allocated", "shipped"];
          return (
            <div
              key={step}
              className={`p-4 ${idx < 3 ? "border-r border-rule" : ""} ${
                reached ? "" : "opacity-40"
              } ${current ? "bg-amber-bg" : ""}`}
            >
              <p
                className={`caps ${
                  current ? "text-amber" : reached ? "text-forest" : "text-ink-3"
                }`}
              >
                {String(idx + 1).padStart(2, "0")} · {captions[idx]}
              </p>
              <p className="font-serif text-base mt-1">{labels[idx]}</p>
              {current && isPendingAllocation && (
                <p className="caps text-amber mt-1 animate-ink-pulse">締切待ち</p>
              )}
            </div>
          );
        })}
      </div>

      {isPendingAllocation && (
        <div className="bg-amber-bg border border-amber px-4 py-3 mb-6 flex gap-3">
          <span className="font-serif text-xl text-amber">⚠</span>
          <div>
            <p className="font-medium text-amber">割り当て対象商品が含まれます</p>
            <p className="text-sm text-ink-2 mt-1 leading-relaxed">
              受付締切後、店舗側で各買い手への配分本数を決定します。希望本数を下回る可能性があり、確定後の
              <span className="font-medium text-ink">キャンセルは不可</span>です。
            </p>
          </div>
        </div>
      )}

      <p className="ornament my-7" />

      {/* Items */}
      <h2 className="font-serif text-2xl mb-4 tracking-tight">明細</h2>
      <div className="bg-paper border border-rule overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-plate">
              <th className="text-left py-3 px-5 caps">Item</th>
              <th className="text-right py-3 caps w-24">Unit</th>
              <th className="text-right py-3 caps w-24">Qty</th>
              <th className="text-right py-3 px-5 caps w-32">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items.map((item) => {
              const product = item.products as {
                name: string;
                is_allocation?: boolean;
                producer?: string | null;
              } | null;
              const finalQty = item.allocated_quantity ?? item.quantity;
              const showRequested = isPendingAllocation && product?.is_allocation;
              return (
                <tr key={item.id} className="border-b border-rule last:border-b-0">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-serif">{product?.name ?? "—"}</span>
                      {product?.is_allocation && <Tag variant="amber">allocation</Tag>}
                    </div>
                    {product?.producer && (
                      <p className="caps mt-0.5">{product.producer}</p>
                    )}
                  </td>
                  <td className="text-right plate-num text-ink-2">
                    ¥{item.unit_price.toLocaleString()}
                  </td>
                  <td className="text-right plate-num">
                    {showRequested ? `希望 ${item.quantity}` : finalQty}
                  </td>
                  <td className="text-right px-5 plate-num">
                    {showRequested ? (
                      <span className="text-amber">— pending —</span>
                    ) : (
                      `¥${(item.unit_price * finalQty).toLocaleString()}`
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-paper-2">
            <tr>
              <td colSpan={3} className="px-5 py-3 text-right caps">
                {isPendingAllocation ? `希望合計 ${totalQty}本` : `合計 ${totalQty}本`}
              </td>
              <td className="text-right px-5 py-3 font-serif text-2xl plate-num text-plate">
                {isPendingAllocation ? "—" : `¥${total.toLocaleString()}`}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {order.note && (
        <div className="bg-paper border border-rule p-5 mb-4">
          <p className="caps mb-2">備考</p>
          <p className="font-italic-serif text-sm text-ink-2 leading-relaxed">{order.note}</p>
        </div>
      )}

      <div className="mt-6">
        <BuyerCancelOrderButton orderId={order.id} currentStatus={order.status} />
      </div>

      {order.status === "cancelled" && (
        <div className="bg-crimson-bg border border-crimson px-4 py-3 text-sm text-crimson mt-4">
          この発注はキャンセルされました。
        </div>
      )}

      <p className="ornament mt-10" />
    </div>
  );
}
