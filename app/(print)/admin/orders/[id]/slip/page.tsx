// app/(print)/admin/orders/[id]/slip/page.tsx
// 管理者 - 発送伝票（印刷用）

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/admin/PrintButton";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SlipPage({ params }: Props) {
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
      users!orders_buyer_id_fkey!inner (
        company_name
      ),
      order_items (
        id,
        quantity,
        unit_price,
        products (
          id,
          name,
          producer,
          region
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (!order) notFound();

  // キャンセル済みの注文は伝票発行不可
  if (order.status === "cancelled") notFound();

  const buyer = order.users as { company_name: string } | null;
  const total = order.order_items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );
  const totalQty = order.order_items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const orderedAt = new Date(order.ordered_at);
  const issuedAt = new Date();

  return (
    <>
      {/* 印刷スタイル */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              .no-print { display: none !important; }
              body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            @page { size: A4; margin: 15mm; }
          `,
        }}
      />

      {/* 印刷ボタン（画面表示時のみ） */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <PrintButton />
      </div>

      {/* 伝票本体 */}
      <div className="max-w-[210mm] mx-auto p-8 bg-white text-ink text-sm font-sans">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-widest">納 品 書</h1>
          <p className="text-xs text-ink-3 mt-1">
            発行日：{issuedAt.toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </p>
        </div>

        {/* 宛先・発注情報 */}
        <div className="flex justify-between mb-8">
          <div>
            <p className="text-lg font-bold border-b-2 border-gray-900 pb-1 mb-2">
              {buyer?.company_name ?? "—"}{" "}
              <span className="text-sm font-normal">御中</span>
            </p>
            <p className="text-xs text-ink-3">
              注文番号：#{order.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-xs text-ink-3">
              注文日：{orderedAt.toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })}
            </p>
          </div>
          <div className="text-right text-xs text-ink-2">
            <p className="font-bold text-sm text-ink mb-1">Mise</p>
          </div>
        </div>

        {/* 合計金額 */}
        <div className="bg-paper-2 border border-rule-strong rounded px-4 py-3 mb-6 flex justify-between items-center">
          <span className="font-bold">合計金額</span>
          <span className="text-xl font-bold">
            ¥{total.toLocaleString()}
          </span>
        </div>

        {/* 明細テーブル */}
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="border-b-2 border-gray-900">
              <th className="text-left py-2 text-xs font-semibold w-8">No.</th>
              <th className="text-left py-2 text-xs font-semibold">商品名</th>
              <th className="text-left py-2 text-xs font-semibold">生産者 / 産地</th>
              <th className="text-right py-2 text-xs font-semibold">単価</th>
              <th className="text-right py-2 text-xs font-semibold">数量</th>
              <th className="text-right py-2 text-xs font-semibold">小計</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items.map((item, index) => {
              const product = item.products as {
                id: string;
                name: string;
                producer: string | null;
                region: string | null;
              } | null;
              const subtotal = item.unit_price * item.quantity;
              return (
                <tr key={item.id} className="border-b border-rule">
                  <td className="py-2 text-xs text-ink-3">{index + 1}</td>
                  <td className="py-2 text-sm">{product?.name ?? "—"}</td>
                  <td className="py-2 text-xs text-ink-3">
                    {[product?.producer, product?.region]
                      .filter(Boolean)
                      .join(" / ") || "—"}
                  </td>
                  <td className="py-2 text-sm text-right">
                    ¥{item.unit_price.toLocaleString()}
                  </td>
                  <td className="py-2 text-sm text-right">{item.quantity}</td>
                  <td className="py-2 text-sm text-right font-medium">
                    ¥{subtotal.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-900">
              <td colSpan={4} className="py-3 text-sm font-bold text-right">
                合計（{totalQty}本）
              </td>
              <td />
              <td className="py-3 text-sm font-bold text-right">
                ¥{total.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* 備考 */}
        {order.note && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-ink-2 mb-1">備考</p>
            <p className="text-sm text-ink-2 border border-rule rounded p-3">
              {order.note}
            </p>
          </div>
        )}

        {/* フッター */}
        <div className="border-t border-rule-strong pt-4 mt-8 text-center text-xs text-ink-3">
          この伝票は発送準備用です。
        </div>
      </div>
    </>
  );
}
