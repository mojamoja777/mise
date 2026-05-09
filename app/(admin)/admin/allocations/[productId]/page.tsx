// app/(admin)/admin/allocations/[productId]/page.tsx
// 管理者 - 商品別の按分画面

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AllocationForm } from "@/components/admin/AllocationForm";

type Props = {
  params: Promise<{ productId: string }>;
};

type PendingRow = {
  id: string;
  quantity: number;
  order_id: string;
  orders: {
    ordered_at: string;
    note: string | null;
    users: { company_name: string } | null;
  } | null;
};

export default async function AdminAllocationDetailPage({ params }: Props) {
  const { productId } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select(
      "id, name, producer, vintage, region, stock, allocation_deadline, is_allocation"
    )
    .eq("id", productId)
    .is("deleted_at", null)
    .single();

  if (!product) notFound();

  const { data: rows, error } = await supabase
    .from("order_items")
    .select(
      `
      id,
      quantity,
      order_id,
      orders!inner (
        ordered_at,
        note,
        status,
        users!orders_buyer_id_fkey!inner (
          company_name
        )
      )
    `
    )
    .eq("product_id", productId)
    .eq("orders.status", "allocation_pending")
    .is("allocated_quantity", null)
    .order("ordered_at", {
      ascending: true,
      referencedTable: "orders",
    });

  const requests = (rows ?? []) as unknown as PendingRow[];
  const totalRequested = requests.reduce((sum, r) => sum + r.quantity, 0);
  const expired = product.allocation_deadline
    ? new Date(product.allocation_deadline).getTime() <= Date.now()
    : false;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link
        href="/admin/allocations"
        className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-[#1c3a5c] mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        割り当て一覧に戻る
      </Link>

      <div className="bg-white rounded-xl border border-rule p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-ink">
              {product.name}
              {product.vintage && (
                <span className="text-sm text-ink-3 ml-2">
                  {product.vintage}
                </span>
              )}
            </h1>
            {product.producer && (
              <p className="text-sm text-ink-3 mt-0.5">
                {product.producer}
                {product.region && ` ・ ${product.region}`}
              </p>
            )}
          </div>
          <div className="text-right text-xs text-ink-3">
            {product.allocation_deadline && (
              <p>
                受付締切：
                <span className="text-ink ml-1">
                  {new Date(product.allocation_deadline).toLocaleString(
                    "ja-JP",
                    {
                      year: "numeric",
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </span>
                {expired ? (
                  <span className="ml-2 inline-block text-[10px] text-crimson bg-crimson-bg rounded-full px-2 py-0.5">
                    受付終了
                  </span>
                ) : (
                  <span className="ml-2 inline-block text-[10px] text-slate bg-slate-bg rounded-full px-2 py-0.5">
                    受付中
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-rule">
          <div>
            <p className="text-xs text-ink-3">在庫</p>
            <p className="text-lg font-semibold text-ink mt-1">
              {product.stock}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-3">希望本数合計</p>
            <p
              className={`text-lg font-semibold mt-1 ${
                totalRequested > product.stock
                  ? "text-crimson"
                  : "text-ink"
              }`}
            >
              {totalRequested}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-3">リクエスト件数</p>
            <p className="text-lg font-semibold text-ink mt-1">
              {requests.length}件
            </p>
          </div>
        </div>

        {!expired && (
          <div className="mt-4 bg-amber-bg border border-amber text-amber text-xs px-3 py-2 rounded-lg">
            まだ受付期間中です。締切後の按分を推奨します。
          </div>
        )}
      </div>

      {error && (
        <div className="bg-crimson-bg border border-crimson text-crimson text-sm px-4 py-3 rounded-xl mb-4">
          リクエスト一覧の取得に失敗しました。
        </div>
      )}

      {requests.length > 0 ? (
        <AllocationForm
          productId={productId}
          stock={product.stock}
          requests={requests.map((r) => ({
            id: r.id,
            orderId: r.order_id,
            companyName: r.orders?.users?.company_name ?? "—",
            orderedAt: r.orders?.ordered_at ?? "",
            note: r.orders?.note ?? null,
            requestedQuantity: r.quantity,
          }))}
        />
      ) : (
        <div className="bg-white rounded-xl border border-rule px-6 py-10 text-center text-sm text-ink-3">
          按分待ちのリクエストはありません
        </div>
      )}
    </div>
  );
}
