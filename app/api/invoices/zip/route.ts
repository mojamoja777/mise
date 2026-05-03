// app/api/invoices/zip/route.ts
// 指定月の請求書PDFを一括ZIPダウンロード（admin のみ）
// 使い方: GET /api/invoices/zip?month=2026-03

import JSZip from "jszip";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getTenantByBuyerId, type Tenant } from "@/lib/tenant";
import {
  invoicePdfFileName,
  renderInvoicePdf,
  type InvoicePdfData,
} from "@/lib/pdf/invoice";

// 50件のPDF生成は時間がかかるのでタイムアウトを延ばす（Fluid Compute 最大300秒）
export const maxDuration = 300;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const month = url.searchParams.get("month"); // YYYY-MM
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "month パラメータが不正です（YYYY-MM 形式）" },
      { status: 400 }
    );
  }

  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }
  const supabase = auth.supabase;

  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  const periodStart = `${year}-${pad(monthNum)}-01`;
  const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  const periodEnd = `${year}-${pad(monthNum)}-${pad(lastDay)}`;

  const { data: invoices, error } = await supabase
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
        sort_order
      )
    `
    )
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .order("issued_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!invoices || invoices.length === 0) {
    return NextResponse.json(
      { error: "該当月の請求書が存在しません" },
      { status: 404 }
    );
  }

  const zip = new JSZip();
  // tenant情報は同一buyerで重複するのでキャッシュ
  const tenantCache = new Map<string, Tenant | null>();

  for (const invoice of invoices) {
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

    let tenant = tenantCache.get(invoice.buyer_id);
    if (tenant === undefined) {
      tenant = await getTenantByBuyerId(supabase, invoice.buyer_id);
      tenantCache.set(invoice.buyer_id, tenant);
    }

    const data: InvoicePdfData = {
      id: invoice.id,
      periodStart: invoice.period_start,
      periodEnd: invoice.period_end,
      totalAmount: Number(invoice.total_amount),
      note: invoice.note,
      issuedAt: invoice.issued_at,
      updatedAt: invoice.updated_at,
      items: sortedItems.map((item) => ({
        productName: item.product_name,
        producer: item.producer,
        region: item.region,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
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
      },
    };
    const pdf = await renderInvoicePdf(data);
    zip.file(invoicePdfFileName(data), pdf);
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const zipFileName = `請求書_${month}.zip`;

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(zipFileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
