// app/api/cron/generate-invoices/route.ts
// 毎月1日に前月分の請求書を自動生成するCronエンドポイント
// Vercel Cron から Authorization: Bearer {CRON_SECRET} で呼ばれる

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateInvoicesForMonth } from "@/lib/invoices";

export async function GET(request: Request) {
  // Vercel Cron の認証確認
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET が設定されていません" },
      { status: 500 }
    );
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 前月を対象期間として計算（JSTの「今」を基準）
  const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const targetYear =
    nowJst.getUTCMonth() === 0 ? nowJst.getUTCFullYear() - 1 : nowJst.getUTCFullYear();
  const targetMonth =
    nowJst.getUTCMonth() === 0 ? 12 : nowJst.getUTCMonth();

  try {
    const supabase = createServiceClient();
    const result = await generateInvoicesForMonth(supabase, targetYear, targetMonth);
    return NextResponse.json({
      ok: true,
      targetYear,
      targetMonth,
      created: result.created.length,
      skipped: result.skipped.length,
      createdIds: result.created,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
