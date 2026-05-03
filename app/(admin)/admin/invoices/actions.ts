// app/(admin)/admin/invoices/actions.ts
// 請求書のサーバーアクション（手動生成・編集）

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { generateInvoicesForMonth } from "@/lib/invoices";

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
    }>;
  }
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };
  const supabase = auth.supabase;

  // 合計再計算
  const totalAmount = input.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

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
      total_amount: totalAmount,
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
