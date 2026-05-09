// app/(admin)/admin/invoices/[id]/page.tsx
// 管理者 - 請求書詳細・編集

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { InvoiceEditor } from "@/components/admin/InvoiceEditor";
import { computeDueDateIso } from "@/lib/invoices";
import { getTenantByBuyerId } from "@/lib/tenant";
import { PlateCorner } from "@/components/ui/PlateCorner";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminInvoiceDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      `
      id,
      buyer_id,
      period_start,
      period_end,
      total_amount,
      note,
      status,
      issued_at,
      updated_at,
      users!inner ( company_name ),
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

  if (error || !invoice) notFound();

  const buyer = invoice.users as { company_name: string } | null;
  const sortedItems = [...invoice.invoice_items].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const revised =
    new Date(invoice.updated_at).getTime() -
      new Date(invoice.issued_at).getTime() >
    60_000;

  const tenant = await getTenantByBuyerId(supabase, invoice.buyer_id);
  const dueDate = computeDueDateIso(
    invoice.period_end,
    tenant?.payment_terms_days
  );

  return (
    <div className="px-10 pt-7 pb-10 relative max-w-5xl">
      <PlateCorner number="09" />

      <Link
        href="/admin/invoices"
        className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-plate mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        請求書一覧に戻る
      </Link>

      <header className="border-b border-rule pb-5 mb-7 flex items-end justify-between">
        <div>
          <p className="caps">Plate IX · Invoice Detail</p>
          <h1 className="font-serif text-5xl mt-2 tracking-tight">請求書</h1>
          <p className="font-italic-serif text-sm mt-2 text-ink-3">
            #{invoice.id.slice(0, 8).toUpperCase()} · {buyer?.company_name ?? "—"} ·{" "}
            {invoice.period_start} 〜 {invoice.period_end}
          </p>
          {dueDate && (
            <p className="text-xs text-ink-3 mt-1">
              お支払期限：
              {new Date(dueDate).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })}
            </p>
          )}
          {revised && (
            <p className="text-xs text-crimson mt-1">
              最終更新：
              {new Date(invoice.updated_at).toLocaleString("ja-JP")}（修正済み）
            </p>
          )}
        </div>
        <a
          href={`/api/invoices/${invoice.id}/pdf`}
          className="inline-flex items-center gap-1.5 bg-plate text-paper px-4 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
        >
          <FileText className="w-4 h-4" />
          PDFダウンロード
        </a>
      </header>

      <InvoiceEditor
        invoiceId={invoice.id}
        initialItems={sortedItems.map((item) => ({
          product_name: item.product_name,
          producer: item.producer,
          region: item.region,
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          tax_rate: Number(item.tax_rate),
        }))}
        initialNote={invoice.note}
      />

      <p className="ornament mt-10" />
    </div>
  );
}
