import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GenerateInvoicesButton } from "@/components/admin/GenerateInvoicesButton";
import { PlateCorner, Tag } from "@/components/ui";

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
    `,
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

  const months = Array.from(new Set(invoices?.map((inv) => inv.period_start.slice(0, 7)) ?? []));

  return (
    <div className="px-10 pt-7 pb-10 relative">
      <PlateCorner number="09" />

      <header className="border-b border-rule pb-5 mb-7 flex items-baseline justify-between">
        <div>
          <p className="caps">Plate IX · Invoices</p>
          <h1 className="font-serif text-5xl mt-2 tracking-tight">請求簿</h1>
          <p className="font-italic-serif text-base mt-2 text-ink-3">毎月1日に前月分を自動生成</p>
        </div>
        <GenerateInvoicesButton />
      </header>

      {/* Filter & bulk DL */}
      <div className="flex items-center gap-3 mb-5">
        <form className="flex items-center gap-2">
          <label className="caps">対象月</label>
          <select
            name="month"
            defaultValue={month ?? ""}
            className="text-sm border border-rule-strong px-3 py-1.5 bg-paper-2 focus:outline-none focus:border-plate"
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
            className="text-xs bg-paper border border-rule-strong text-ink-2 px-3 py-1.5 hover:bg-paper-2 transition-colors"
          >
            絞り込み
          </button>
        </form>
        {month && (
          <a
            href={`/api/invoices/zip?month=${month}`}
            className="inline-flex items-center gap-1.5 bg-plate text-paper px-3 py-1.5 text-xs hover:bg-plate-deep transition-colors font-italic-serif"
          >
            <Download className="w-3.5 h-3.5" />
            一括ZIPダウンロード（{month}）
          </a>
        )}
      </div>

      {error && (
        <div className="bg-crimson-bg border border-crimson text-crimson text-sm px-4 py-3 mb-4">
          請求書の取得に失敗しました。
        </div>
      )}

      {invoices && invoices.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-plate">
              <th className="text-left py-3 caps w-32">請求番号</th>
              <th className="text-left py-3 caps">請求先</th>
              <th className="text-left py-3 caps w-40">対象期間</th>
              <th className="text-right py-3 caps w-32">合計（税込）</th>
              <th className="text-left py-3 caps w-28">発行日</th>
              <th className="text-center py-3 caps w-16">PDF</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => {
              const buyer = invoice.users as { company_name: string } | null;
              const revised =
                new Date(invoice.updated_at).getTime() -
                  new Date(invoice.issued_at).getTime() >
                60_000;
              return (
                <tr key={invoice.id} className="border-b border-rule hover:bg-paper-2 transition-colors">
                  <td className="py-3.5">
                    <Link
                      href={`/admin/invoices/${invoice.id}`}
                      className="font-mono text-xs text-plate hover:underline"
                    >
                      #{invoice.id.slice(0, 8).toUpperCase()}
                    </Link>
                  </td>
                  <td className="py-3.5">
                    <Link
                      href={`/admin/invoices/${invoice.id}`}
                      className="font-serif tracking-tight hover:text-plate"
                    >
                      {buyer?.company_name ?? "—"}
                    </Link>
                    {revised && <Tag variant="amber" className="ml-2">修正あり</Tag>}
                  </td>
                  <td className="text-ink-2 text-xs plate-num">
                    {invoice.period_start} 〜 {invoice.period_end}
                  </td>
                  <td className="text-right plate-num text-plate">
                    ¥{Number(invoice.total_amount).toLocaleString()}
                  </td>
                  <td className="text-ink-3 text-xs plate-num">
                    {new Date(invoice.issued_at).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="text-center">
                    <a
                      href={`/api/invoices/${invoice.id}/pdf`}
                      className="inline-flex items-center gap-1 text-plate hover:underline text-xs"
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
      ) : (
        <div className="bg-paper-2 border border-rule flex flex-col items-center justify-center py-20 text-ink-3">
          <FileText className="w-10 h-10 mb-3" />
          <p className="font-italic-serif text-base">
            {month ? "該当月の請求書がありません" : "請求書がまだありません"}
          </p>
          <p className="caps mt-2">毎月1日に前月分が自動生成されます</p>
        </div>
      )}

      <p className="ornament mt-10" />
    </div>
  );
}
