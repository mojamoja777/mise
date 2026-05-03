// app/(buyer)/buyer/invoices/[id]/page.tsx
// 発注者 - 請求書詳細（自分宛のみ閲覧可。RLS で他社のものは取得不能）

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import { requireBuyer } from "@/lib/auth";
import { computeDueDateIso } from "@/lib/invoices";
import { summarizeTax } from "@/lib/tax";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function BuyerInvoiceDetailPage({ params }: Props) {
  const { id } = await params;
  const auth = await requireBuyer();
  if (!auth.ok) {
    return <div className="p-4 text-sm text-red-600">{auth.error}</div>;
  }

  const { data: invoice } = await auth.supabase
    .from("invoices")
    .select(
      `
      id,
      buyer_id,
      period_start,
      period_end,
      subtotal_amount,
      tax_amount,
      total_amount,
      note,
      issued_at,
      updated_at,
      invoice_items (
        id,
        product_name,
        producer,
        region,
        vintage,
        quantity,
        unit_price,
        tax_rate,
        sort_order
      )
    `
    )
    .eq("id", id)
    .single();

  if (!invoice || invoice.buyer_id !== auth.user.id) notFound();

  const sortedItems = [...invoice.invoice_items].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  const summary = summarizeTax(
    sortedItems.map((it) => ({
      quantity: it.quantity,
      unit_price: Number(it.unit_price),
      tax_rate: Number(it.tax_rate),
    }))
  );

  const { data: profile } = await auth.supabase
    .from("users")
    .select("tenant_id")
    .eq("id", auth.user.id)
    .single();
  const { data: tenant } = profile?.tenant_id
    ? await auth.supabase
        .from("tenants")
        .select("payment_terms_days, display_name, bank_info")
        .eq("id", profile.tenant_id)
        .single()
    : { data: null };

  const dueDate = computeDueDateIso(
    invoice.period_end,
    tenant?.payment_terms_days ?? null
  );

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto">
      <Link
        href="/buyer/invoices"
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#6B1A35] mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        請求書一覧へ戻る
      </Link>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {invoice.period_start.slice(0, 7).replace("-", "年")}月分 請求書
          </h1>
          <p className="text-xs text-gray-400 font-mono">
            #{invoice.id.slice(0, 8).toUpperCase()}
          </p>
          {tenant?.display_name && (
            <p className="text-xs text-gray-500 mt-1">
              発行元：{tenant.display_name}
            </p>
          )}
        </div>
        <a
          href={`/api/invoices/${invoice.id}/pdf`}
          className="inline-flex items-center gap-1.5 bg-[#6B1A35] text-white px-3 py-1.5 rounded-lg text-xs hover:bg-[#5a1630] transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          PDF
        </a>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <h2 className="text-xs font-semibold text-gray-500 mb-2">明細</h2>
        <div className="space-y-3">
          {sortedItems.map((it) => (
            <div key={it.id} className="flex justify-between text-sm">
              <div className="flex-1 pr-2">
                <p className="text-gray-900">{it.product_name}</p>
                <p className="text-xs text-gray-400">
                  ¥{Number(it.unit_price).toLocaleString()} × {it.quantity}本
                </p>
              </div>
              <p className="font-semibold text-gray-900">
                ¥{(Number(it.unit_price) * it.quantity).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-500">税抜小計</span>
          <span className="text-gray-700">
            ¥{summary.subtotal.toLocaleString()}
          </span>
        </div>
        {summary.breakdown.map((b) => (
          <div key={b.rate} className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">
              消費税（{Math.round(b.rate * 100)}%対象 ¥{b.subtotal.toLocaleString()}）
            </span>
            <span className="text-gray-700">¥{b.tax.toLocaleString()}</span>
          </div>
        ))}
        <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t border-gray-100">
          <span className="text-gray-900">税込合計</span>
          <span className="text-[#3B0A1E]">
            ¥{Number(invoice.total_amount).toLocaleString()}
          </span>
        </div>
        {dueDate && (
          <p className="text-xs text-gray-500 mt-2">
            お支払期限：
            {new Date(dueDate).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </p>
        )}
      </div>

      {tenant?.bank_info && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <h2 className="text-xs font-semibold text-gray-500 mb-1">お振込先</h2>
          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">
            {tenant.bank_info}
          </pre>
        </div>
      )}

      {invoice.note && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-xs font-semibold text-gray-500 mb-1">備考</h2>
          <p className="text-sm text-gray-700">{invoice.note}</p>
        </div>
      )}
    </div>
  );
}
