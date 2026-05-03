// app/(admin)/admin/invoices/page.tsx
// 管理者 - 請求書一覧

import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GenerateInvoicesButton } from "@/components/admin/GenerateInvoicesButton";

type Props = {
  searchParams: Promise<{ month?: string }>;
};

export default async function AdminInvoicesPage({ searchParams }: Props) {
  const { month } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("invoices")
    .select(
      `
      id,
      period_start,
      period_end,
      total_amount,
      status,
      issued_at,
      updated_at,
      users!inner ( company_name )
    `
    )
    .order("period_start", { ascending: false })
    .order("issued_at", { ascending: false });

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    const pad = (n: number) => String(n).padStart(2, "0");
    const start = `${y}-${pad(m)}-01`;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const end = `${y}-${pad(m)}-${pad(lastDay)}`;
    query = query.eq("period_start", start).eq("period_end", end);
  }

  const { data: invoices, error } = await query;

  // 月のユニーク一覧（フィルタUI用）
  const months = Array.from(
    new Set(
      invoices?.map((inv) => inv.period_start.slice(0, 7)) ?? []
    )
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">請求書</h1>
        <GenerateInvoicesButton />
      </div>

      {/* 月フィルタ & 一括DL */}
      <div className="flex items-center gap-3 mb-4">
        <form className="flex items-center gap-2">
          <label className="text-xs text-gray-600">対象月：</label>
          <select
            name="month"
            defaultValue={month ?? ""}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="">すべて</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="text-sm bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50"
          >
            絞り込み
          </button>
        </form>
        {month && (
          <a
            href={`/api/invoices/zip?month=${month}`}
            className="inline-flex items-center gap-1.5 bg-[#6B1A35] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#5a1630] transition-colors"
          >
            <Download className="w-4 h-4" />
            一括ZIPダウンロード（{month}）
          </a>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
          請求書の取得に失敗しました。
        </div>
      )}

      {invoices && invoices.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  請求番号
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  請求先
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  対象期間
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  合計金額（税込）
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  発行日
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
                  PDF
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((invoice) => {
                const buyer = invoice.users as {
                  company_name: string;
                } | null;
                const revised =
                  new Date(invoice.updated_at).getTime() -
                    new Date(invoice.issued_at).getTime() >
                  60_000;
                return (
                  <tr
                    key={invoice.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/invoices/${invoice.id}`}
                        className="font-mono text-xs text-[#6B1A35] hover:underline"
                      >
                        #{invoice.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-gray-900">
                      <Link
                        href={`/admin/invoices/${invoice.id}`}
                        className="hover:text-[#6B1A35]"
                      >
                        {buyer?.company_name ?? "—"}
                      </Link>
                      {revised && (
                        <span className="ml-2 inline-block text-[10px] text-red-600 border border-red-300 rounded px-1.5 py-0.5">
                          修正あり
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-600 text-xs">
                      {invoice.period_start} 〜 {invoice.period_end}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-gray-900">
                      ¥{Number(invoice.total_amount).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">
                      {new Date(invoice.issued_at).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <a
                        href={`/api/invoices/${invoice.id}/pdf`}
                        className="inline-flex items-center gap-1 text-[#6B1A35] hover:underline text-xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        DL
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-20 text-gray-400">
          <FileText className="w-10 h-10 mb-3" />
          <p className="text-sm">
            {month ? "該当月の請求書がありません" : "請求書がまだありません"}
          </p>
          <p className="text-xs mt-1">
            毎月1日に前月分が自動生成されます
          </p>
        </div>
      )}
    </div>
  );
}
