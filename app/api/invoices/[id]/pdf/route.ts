// app/api/invoices/[id]/pdf/route.ts
// 請求書PDFの個別ダウンロードエンドポイント（admin のみ）

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getTenantByBuyerId } from "@/lib/tenant";
import { summarizeTax } from "@/lib/tax";
import { computeDueDateIso } from "@/lib/invoices";
import {
  invoicePdfFileName,
  renderInvoicePdf,
  type InvoicePdfData,
} from "@/lib/pdf/invoice";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  const supabase = auth.supabase;
  const role = auth.user.app_metadata?.role as "admin" | "buyer" | undefined;

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
      issued_at,
      updated_at,
      users!inner (
        company_name,
        customer_code,
        postal_code,
        address,
        phone
      ),
      invoice_items (
        product_name,
        producer,
        region,
        quantity,
        unit_price,
        tax_rate,
        sort_order
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // buyer は自分宛の請求書のみ取得可能
  if (role === "buyer" && invoice.buyer_id !== auth.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const buyer = invoice.users as {
    company_name: string;
    customer_code: string | null;
    postal_code: string | null;
    address: string | null;
    phone: string | null;
  } | null;
  const sortedItems = [...invoice.invoice_items].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  const tenant = await getTenantByBuyerId(supabase, invoice.buyer_id);

  // 税抜小計・消費税は明細から再計算する（ヘッダの値はキャッシュとして信頼するが、
  // 表示の整合性を最大化するため breakdown はその場で算出）
  const summary = summarizeTax(
    sortedItems.map((it) => ({
      quantity: it.quantity,
      unit_price: Number(it.unit_price),
      tax_rate: Number(it.tax_rate),
    }))
  );

  // 支払期限 = period_end + tenant.payment_terms_days
  const dueDate = computeDueDateIso(invoice.period_end, tenant?.payment_terms_days);

  const data: InvoicePdfData = {
    id: invoice.id,
    periodStart: invoice.period_start,
    periodEnd: invoice.period_end,
    subtotalAmount: summary.subtotal,
    taxAmount: summary.tax,
    totalAmount: Number(invoice.total_amount),
    taxBreakdown: summary.breakdown,
    dueDate,
    note: invoice.note,
    issuedAt: invoice.issued_at,
    updatedAt: invoice.updated_at,
    items: sortedItems.map((item) => ({
      productName: item.product_name,
      producer: item.producer,
      region: item.region,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      taxRate: Number(item.tax_rate),
    })),
    buyer: {
      companyName: buyer?.company_name ?? "—",
      customerCode: buyer?.customer_code ?? null,
      postalCode: buyer?.postal_code ?? null,
      address: buyer?.address ?? null,
      phone: buyer?.phone ?? null,
    },
    tenant: {
      companyName: tenant?.company_name ?? "",
      displayName: tenant?.display_name ?? "Mise",
      postalCode: tenant?.postal_code ?? null,
      address: tenant?.address ?? null,
      phone: tenant?.phone ?? null,
      fax: tenant?.fax ?? null,
      invoiceNumber: tenant?.invoice_number ?? null,
      bankInfo: tenant?.bank_info ?? null,
      representative: tenant?.representative ?? null,
      logoUrl: tenant?.logo_url ?? null,
      stampUrl: tenant?.stamp_url ?? null,
    },
  };

  const pdfBuffer = await renderInvoicePdf(data);
  const fileName = invoicePdfFileName(data);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
