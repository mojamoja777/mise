// app/(admin)/admin/orders/[id]/page.tsx
// 管理者 - 発注詳細ページ

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { UpdateStatusButton } from "@/components/admin/UpdateStatusButton";
import { CancelOrderButton } from "@/components/admin/CancelOrderButton";
import { PlateCorner } from "@/components/ui/PlateCorner";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: Props) {
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
      updated_at,
      users!orders_buyer_id_fkey!inner (
        company_name
      ),
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

  const buyer = order.users as { company_name: string } | null;
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
    <div className="px-10 pt-7 pb-10 relative max-w-5xl">
      <PlateCorner number="08" />

      {/* パンくずナビ */}
      <Link
        href="/admin"
        className="flex items-center gap-1 text-sm text-ink-3 hover:text-plate mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        発注一覧へ戻る
      </Link>

      {/* Plate ヘッダー */}
      <header className="border-b border-rule pb-5 mb-7 flex items-end justify-between">
        <div>
          <p className="caps">Plate VIII · Order Detail</p>
          <h1 className="font-serif text-5xl mt-2 tracking-tight">発注詳細</h1>
          <p className="font-italic-serif text-sm mt-2 text-ink-3">
            #{order.id.slice(0, 8).toUpperCase()} ·{" "}
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
      </header>

      {/* 2カラムレイアウト */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* 発注内容 */}
        <div className="bg-white rounded-xl border border-rule p-5">
          <h2 className="text-sm font-semibold text-ink-2 mb-4">発注内容</h2>
          {isPendingAllocation && (
            <p className="text-xs text-amber bg-amber-bg border border-amber rounded-lg px-3 py-2 mb-3">
              割り当て待ち：表示は希望本数です。確定後に確定本数で金額が決まります。
            </p>
          )}
          <div className="space-y-3">
            {order.order_items.map((item) => {
              const product = item.products as {
                id: string;
                name: string;
                producer: string | null;
                region: string | null;
                is_allocation?: boolean;
              } | null;
              const finalQty = item.allocated_quantity ?? item.quantity;
              const showRequested =
                isPendingAllocation && product?.is_allocation;
              return (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1 pr-3">
                    <p className="text-sm font-medium text-ink">
                      {product?.name ?? "—"}
                    </p>
                    {(product?.producer || product?.region) && (
                      <p className="text-xs text-ink-3">
                        {[product.producer, product.region]
                          .filter(Boolean)
                          .join(" / ")}
                      </p>
                    )}
                    <p className="text-xs text-ink-3">
                      ¥{item.unit_price.toLocaleString()} ×{" "}
                      {showRequested
                        ? `希望 ${item.quantity}本`
                        : `${finalQty}本`}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-ink shrink-0">
                    {showRequested
                      ? "—"
                      : `¥${(item.unit_price * finalQty).toLocaleString()}`}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="border-t border-rule mt-4 pt-4 flex justify-between">
            <span className="text-sm text-ink-2">
              {isPendingAllocation ? `希望合計 ${totalQty}本` : `合計 ${totalQty}本`}
            </span>
            <span className="text-lg font-bold text-[#3B0A1E]">
              {isPendingAllocation ? "—" : `¥${total.toLocaleString()}`}
            </span>
          </div>
        </div>

        {/* 顧客・備考情報 */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-rule p-5">
            <h2 className="text-sm font-semibold text-ink-2 mb-3">顧客情報</h2>
            <p className="text-sm font-medium text-ink">
              {buyer?.company_name ?? "—"}
            </p>
          </div>

          {order.note && (
            <div className="bg-white rounded-xl border border-rule p-5">
              <h2 className="text-sm font-semibold text-ink-2 mb-2">備考</h2>
              <p className="text-sm text-ink-2 leading-relaxed">{order.note}</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-rule p-5">
            <h2 className="text-sm font-semibold text-ink-2 mb-2">更新日時</h2>
            <p className="text-xs text-ink-3">
              {new Date(order.updated_at).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* アクション */}
      <div className="bg-white rounded-xl border border-rule p-5 mb-4">
        <h2 className="text-sm font-semibold text-ink-2 mb-4">
          ステータス変更
        </h2>
        <div className="flex items-center gap-4">
          <UpdateStatusButton orderId={order.id} currentStatus={order.status} />
          <CancelOrderButton orderId={order.id} currentStatus={order.status} />
        </div>
      </div>

      {/* 伝票発行 */}
      {order.status !== "cancelled" && (
        <div className="bg-white rounded-xl border border-rule p-5 mb-4">
          <h2 className="text-sm font-semibold text-ink-2 mb-4">伝票</h2>
          <Link
            href={`/admin/orders/${order.id}/slip`}
            target="_blank"
            className="inline-flex items-center gap-1.5 bg-white border border-rule-strong text-ink-2 px-4 py-2 rounded-lg text-sm hover:bg-paper-2 transition-colors"
          >
            <FileText className="w-4 h-4" />
            納品書を表示
          </Link>
        </div>
      )}

      {order.status === "cancelled" && (
        <div className="bg-crimson-bg rounded-xl border border-crimson px-5 py-4 text-sm text-crimson">
          この発注はキャンセルされました。
        </div>
      )}

      <p className="ornament mt-10" />
    </div>
  );
}
