// app/(buyer)/buyer/invoices/page.tsx
// 発注者 - 自分宛の請求書一覧

import Link from "next/link";
import { FileText } from "lucide-react";
import { requireBuyer } from "@/lib/auth";
import { computeDueDateIso } from "@/lib/invoices";

export default async function BuyerInvoicesPage() {
  const auth = await requireBuyer();
  if (!auth.ok) {
    return <div className="p-4 text-sm text-red-600">{auth.error}</div>;
  }

  const { data: profile } = await auth.supabase
    .from("users")
    .select("tenant_id")
    .eq("id", auth.user.id)
    .single();

  const { data: tenant } = profile?.tenant_id
    ? await auth.supabase
        .from("tenants")
        .select("payment_terms_days, display_name")
        .eq("id", profile.tenant_id)
        .single()
    : { data: null };

  const { data: invoices } = await auth.supabase
    .from("invoices")
    .select("id, period_start, period_end, total_amount, status, issued_at, updated_at")
    .eq("buyer_id", auth.user.id)
    .order("period_end", { ascending: false });

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto">
      <h1 className="text-lg font-semibold text-gray-900 mb-1">請求書</h1>
      {tenant?.display_name && (
        <p className="text-xs text-gray-400 mb-4">
          発行元：{tenant.display_name}
        </p>
      )}

      {invoices && invoices.length > 0 ? (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const due = computeDueDateIso(
              inv.period_end,
              tenant?.payment_terms_days ?? null
            );
            return (
              <Link
                key={inv.id}
                href={`/buyer/invoices/${inv.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatPeriod(inv.period_start, inv.period_end)}
                  </p>
                  <span className="text-base font-bold text-[#3B0A1E]">
                    ¥{Number(inv.total_amount).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-mono">
                  #{inv.id.slice(0, 8).toUpperCase()}
                </p>
                {due && (
                  <p className="text-xs text-gray-500 mt-1">
                    お支払期限：
                    {new Date(due).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <FileText className="w-10 h-10 mb-3" />
          <p className="text-sm">発行済みの請求書はまだありません</p>
        </div>
      )}
    </div>
  );
}

function formatPeriod(start: string, end: string): string {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  return `${s.getFullYear()}年${s.getMonth() + 1}月分 (${s.getMonth() + 1}/${s.getDate()} 〜 ${e.getMonth() + 1}/${e.getDate()})`;
}
