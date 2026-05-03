// lib/invoices.ts
// 請求書集計ロジック（Cron と手動生成の両方から利用）

import { createElement } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { rateForClass, summarizeTax, type TaxClass } from "@/lib/tax";
import { sendNotificationEmail } from "@/lib/mailer";
import { InvoiceIssuedEmail } from "@/lib/email/InvoiceIssued";
import { getBuyerEmail } from "@/lib/email/recipients";
import { appUrl } from "@/lib/url";

/**
 * 期間終了日 + 支払いサイト日数 で支払期限の ISO 文字列を返す。
 * payment_terms_days が未設定なら null。
 */
export function computeDueDateIso(
  periodEnd: string,
  paymentTermsDays: number | null | undefined
): string | null {
  if (paymentTermsDays == null) return null;
  const date = new Date(`${periodEnd}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + paymentTermsDays);
  return date.toISOString();
}

/**
 * 対象月の月初（1日 00:00:00 JST）と翌月初（1日 00:00:00 JST）を返す
 * Supabase のタイムスタンプは UTC 保存だが、飲食店の営業は JST ベースで判定する
 */
export function getMonthRangeJst(year: number, month: number): {
  periodStart: string; // YYYY-MM-DD（JSTの月初）
  periodEnd: string; // YYYY-MM-DD（JSTの月末）
  fromIso: string; // UTC ISO：対象月初 00:00:00 JST
  toIso: string; // UTC ISO：翌月初 00:00:00 JST（排他）
} {
  // JSTはUTC+9。JSTの月初 00:00:00 = UTCの前日 15:00:00
  const startUtc = new Date(Date.UTC(year, month - 1, 1, -9, 0, 0));
  const endUtc = new Date(Date.UTC(year, month, 1, -9, 0, 0));
  // 対象月の末日（UTC基準で day=0 にすると前月末日になる）
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    periodStart: `${year}-${pad(month)}-01`,
    periodEnd: `${year}-${pad(month)}-${pad(lastDay)}`,
    fromIso: startUtc.toISOString(),
    toIso: endUtc.toISOString(),
  };
}

/**
 * 指定期間の請求対象注文を buyer ごとに集計し、invoices + invoice_items を作成する
 *
 * 仕様：
 * - ordered_at が対象期間内の注文を対象
 * - status が pending / confirmed のみ請求対象（cancelled と allocation_pending は除外）
 * - 各明細は allocated_quantity > 0 のものだけ計上（割り当て 0 本＝落選を除外）
 * - 同一 buyer の同一期間に請求書が既に存在する場合はスキップ
 *
 * @returns 生成された請求書の id 一覧
 */
export async function generateInvoicesForMonth(
  supabase: SupabaseClient<Database>,
  year: number,
  month: number
): Promise<{ created: string[]; skipped: string[] }> {
  const range = getMonthRangeJst(year, month);

  // 対象期間の請求対象注文を取得（明細・商品・buyer情報を含む）
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(
      `
      id,
      buyer_id,
      ordered_at,
      users!orders_buyer_id_fkey!inner ( company_name ),
      order_items (
        order_id,
        quantity,
        allocated_quantity,
        unit_price,
        products (
          name,
          producer,
          region,
          vintage,
          tax_class
        )
      )
    `
    )
    .in("status", ["pending", "confirmed"])
    .gte("ordered_at", range.fromIso)
    .lt("ordered_at", range.toIso)
    .order("ordered_at", { ascending: true });

  if (ordersError) {
    throw new Error(`注文の取得に失敗: ${ordersError.message}`);
  }
  if (!orders || orders.length === 0) {
    return { created: [], skipped: [] };
  }

  // buyer_id ごとに注文をグループ化
  const grouped = new Map<string, typeof orders>();
  for (const order of orders) {
    const bucket = grouped.get(order.buyer_id) ?? [];
    bucket.push(order);
    grouped.set(order.buyer_id, bucket);
  }

  const created: string[] = [];
  const skipped: string[] = [];

  for (const [buyerId, buyerOrders] of grouped.entries()) {
    // 既存の請求書をチェック（UNIQUE制約があるので INSERT で落ちるがユーザーフレンドリーに）
    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("buyer_id", buyerId)
      .eq("period_start", range.periodStart)
      .eq("period_end", range.periodEnd)
      .maybeSingle();

    if (existing) {
      skipped.push(existing.id);
      continue;
    }

    // 明細を平坦化してスナップショット生成
    const items: Database["public"]["Tables"]["invoice_items"]["Insert"][] = [];
    let sortOrder = 0;
    for (const order of buyerOrders) {
      for (const item of order.order_items) {
        // 確定本数（allocated_quantity）が 0 / NULL の明細は請求対象外
        const billableQty = item.allocated_quantity ?? 0;
        if (billableQty <= 0) continue;
        const product = item.products as {
          name: string;
          producer: string | null;
          region: string | null;
          vintage: number | null;
          tax_class: TaxClass | null;
        } | null;
        const taxRate = rateForClass(product?.tax_class ?? "standard");
        items.push({
          invoice_id: "", // 後で設定
          order_id: order.id,
          product_name: product?.name ?? "(商品名不明)",
          producer: product?.producer ?? null,
          region: product?.region ?? null,
          vintage: product?.vintage ?? null,
          quantity: billableQty,
          unit_price: item.unit_price,
          tax_rate: taxRate,
          sort_order: sortOrder++,
        });
      }
    }

    if (items.length === 0) continue;

    // 税抜小計・消費税・税込総額を税率ごとに算出
    const { subtotal, tax, total } = summarizeTax(
      items.map((it) => ({
        quantity: it.quantity,
        unit_price: Number(it.unit_price),
        tax_rate: Number(it.tax_rate ?? 0.1),
      }))
    );

    // 請求書ヘッダを作成
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        buyer_id: buyerId,
        period_start: range.periodStart,
        period_end: range.periodEnd,
        subtotal_amount: subtotal,
        tax_amount: tax,
        total_amount: total,
      })
      .select("id")
      .single();

    if (invoiceError || !invoice) {
      throw new Error(
        `請求書の作成に失敗（buyer=${buyerId}）: ${invoiceError?.message}`
      );
    }

    // 明細を一括挿入
    const itemsWithInvoiceId = items.map((it) => ({ ...it, invoice_id: invoice.id }));
    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(itemsWithInvoiceId);

    if (itemsError) {
      throw new Error(
        `明細の作成に失敗（invoice=${invoice.id}）: ${itemsError.message}`
      );
    }

    created.push(invoice.id);

    // 請求書発行通知メール（失敗しても処理続行）
    const buyerName =
      (buyerOrders[0].users as unknown as { company_name: string } | null)
        ?.company_name ?? "—";
    const buyerEmail = await getBuyerEmail(buyerId);
    if (buyerEmail) {
      await sendNotificationEmail({
        to: buyerEmail,
        subject: `${year}年${month}月分の請求書を発行しました`,
        react: createElement(InvoiceIssuedEmail, {
          buyerName,
          periodLabel: `${year}年${month}月分`,
          totalAmount: total,
          invoiceUrl: appUrl(`/buyer/invoices/${invoice.id}`),
        }),
      });
    }
  }

  return { created, skipped };
}
