// app/(admin)/admin/invoices/[id]/page.tsx
// 管理者 - 請求書詳細・編集

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { InvoiceEditor } from "@/components/admin/InvoiceEditor";

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

  return (
    <div className="p-8 max-w-4xl">
      <Link
        href="/admin/invoices"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        請求書一覧に戻る
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            請求書 #{invoice.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {buyer?.company_name ?? "—"} / {invoice.period_start} 〜{" "}
            {invoice.period_end}
          </p>
          {revised && (
            <p className="text-xs text-red-600 mt-1">
              最終更新：
              {new Date(invoice.updated_at).toLocaleString("ja-JP")}（修正済み）
            </p>
          )}
        </div>
        <a
          href={`/api/invoices/${invoice.id}/pdf`}
          className="inline-flex items-center gap-1.5 bg-[#6B1A35] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#5a1630] transition-colors"
        >
          <FileText className="w-4 h-4" />
          PDFダウンロード
        </a>
      </div>

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
    </div>
  );
}
