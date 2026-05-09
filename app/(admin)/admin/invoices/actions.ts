// app/(admin)/admin/invoices/actions.ts
// 請求書のサーバーアクション（手動生成・編集・督促）

"use server";

import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { generateInvoicesForMonth, computeDueDateIso } from "@/lib/invoices";
import { summarizeTax } from "@/lib/tax";
import { sendNotificationEmail } from "@/lib/mailer";
import { InvoiceReminderEmail } from "@/lib/email/InvoiceReminder";
import { getBuyerEmail } from "@/lib/email/recipients";
import { appUrl } from "@/lib/url";

/**
 * 指定月の請求書を手動生成する（admin用）
 * month: "YYYY-MM" 形式。未指定なら前月
 */
export async function generateInvoicesAction(
  month?: string
): Promise<{ ok: boolean; created?: number; skipped?: number; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  const supabase = auth.supabase;

  // 対象月を決定（未指定なら前月）
  let year: number;
  let monthNum: number;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    year = y;
    monthNum = m;
  } else {
    const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const currentMonth = nowJst.getUTCMonth(); // 0-indexed
    if (currentMonth === 0) {
      year = nowJst.getUTCFullYear() - 1;
      monthNum = 12;
    } else {
      year = nowJst.getUTCFullYear();
      monthNum = currentMonth; // 1-indexed 前月
    }
  }

  try {
    const result = await generateInvoicesForMonth(supabase, year, monthNum);
    revalidatePath("/admin/invoices");
    return {
      ok: true,
      created: result.created.length,
      skipped: result.skipped.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    return { ok: false, error: message };
  }
}

/**
 * 請求書の明細・備考を更新する
 * items: 完全に置き換える（追加・削除・編集すべて対応）
 */
export async function updateInvoiceAction(
  invoiceId: string,
  input: {
    note: string | null;
    items: Array<{
      product_name: string;
      producer: string | null;
      region: string | null;
      quantity: number;
      unit_price: number;
      tax_rate: number;
    }>;
  }
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  const supabase = auth.supabase;

  // 税抜小計・消費税・税込総額を再計算（税率ごとに切り捨て）
  const summary = summarizeTax(input.items);

  // トランザクション的に：既存明細を全削除 → 新明細を挿入 → ヘッダ更新
  const { error: deleteError } = await supabase
    .from("invoice_items")
    .delete()
    .eq("invoice_id", invoiceId);

  if (deleteError) {
    return { ok: false, error: `明細の削除に失敗: ${deleteError.message}` };
  }

  if (input.items.length > 0) {
    const { error: insertError } = await supabase
      .from("invoice_items")
      .insert(
        input.items.map((item, index) => ({
          invoice_id: invoiceId,
          product_name: item.product_name,
          producer: item.producer,
          region: item.region,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          sort_order: index,
        }))
      );
    if (insertError) {
      return { ok: false, error: `明細の挿入に失敗: ${insertError.message}` };
    }
  }

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      subtotal_amount: summary.subtotal,
      tax_amount: summary.tax,
      total_amount: summary.total,
      note: input.note,
    })
    .eq("id", invoiceId);

  if (updateError) {
    return { ok: false, error: `請求書の更新に失敗: ${updateError.message}` };
  }

  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/admin/invoices");
  return { ok: true };
}

/**
 * 期限超過請求書の督促メールを送信する
 */
export async function sendInvoiceReminderAction(
  invoiceId: string
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  const supabase = auth.supabase;

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      `
      id,
      buyer_id,
      period_start,
      period_end,
      total_amount,
      users!inner ( company_name, tenant_id )
    `
    )
    .eq("id", invoiceId)
    .single();

  if (!invoice) return { ok: false, error: "請求書が見つかりません" };

  const buyer = invoice.users as { company_name: string; tenant_id: string } | null;
  if (!buyer) return { ok: false, error: "請求先が取得できません" };

  // tenant の payment_terms_days で due_date を計算
  const { data: tenant } = await supabase
    .from("tenants")
    .select("payment_terms_days")
    .eq("id", buyer.tenant_id)
    .single();

  const dueDateIso = computeDueDateIso(
    invoice.period_end,
    tenant?.payment_terms_days ?? null
  );
  if (!dueDateIso) {
    return { ok: false, error: "支払期限が設定されていません" };
  }
  const dueDate = new Date(dueDateIso);
  const now = new Date();
  const daysOverdue = Math.floor(
    (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysOverdue <= 0) {
    return { ok: false, error: "支払期限内です" };
  }

  const buyerEmail = await getBuyerEmail(invoice.buyer_id);
  if (!buyerEmail) {
    return { ok: false, error: "送信先メールアドレスが取得できません" };
  }

  const periodLabel = invoice.period_start.slice(0, 7).replace("-", "年") + "月";
  const dueDateLabel = dueDate.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  await sendNotificationEmail({
    to: [buyerEmail],
    subject: `【お支払いのご確認】${periodLabel} 請求書 ${daysOverdue}日経過`,
    react: createElement(InvoiceReminderEmail, {
      buyerName: buyer.company_name,
      periodLabel,
      totalAmount: Number(invoice.total_amount),
      dueDateLabel,
      daysOverdue,
      invoiceUrl: appUrl(`/buyer/invoices/${invoice.id}`),
    }),
  });

  return { ok: true };
}
