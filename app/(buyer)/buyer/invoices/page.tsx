import Link from "next/link";
import { FileText } from "lucide-react";
import { requireBuyer } from "@/lib/auth";
import { computeDueDateIso } from "@/lib/invoices";
import { PlateCorner } from "@/components/ui";

export default async function BuyerInvoicesPage() {
  const auth = await requireBuyer();
  if (!auth.ok) {
    return <div className="p-4 text-sm text-crimson">{auth.error}</div>;
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
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto relative">
      <PlateCorner number="07" />

      <header className="mb-6">
        <p className="caps">Plate VII · Invoices</p>
        <h1 className="font-serif text-4xl mt-2 tracking-tight">請求書</h1>
        {tenant?.display_name && (
          <p className="font-italic-serif text-sm mt-1 text-ink-3">発行元 — {tenant.display_name}</p>
        )}
      </header>

      {invoices && invoices.length > 0 ? (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const due = computeDueDateIso(inv.period_end, tenant?.payment_terms_days ?? null);
            return (
              <Link
                key={inv.id}
                href={`/buyer/invoices/${inv.id}`}
                className="block bg-paper border border-rule p-5 hover:border-plate transition-colors"
              >
                <div className="flex items-baseline justify-between mb-2">
                  <p className="font-serif text-lg tracking-tight">
                    {formatPeriod(inv.period_start, inv.period_end)}
                  </p>
                  <span className="font-serif text-2xl plate-num text-plate">
                    ¥{Number(inv.total_amount).toLocaleString()}
                  </span>
                </div>
                <p className="caps font-mono">#{inv.id.slice(0, 8).toUpperCase()}</p>
                {due && (
                  <p className="caps mt-1 text-ink-3">
                    お支払期限 ·{" "}
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
        <div className="bg-paper-2 border border-rule flex flex-col items-center justify-center py-20 text-ink-3">
          <FileText className="w-10 h-10 mb-3" />
          <p className="font-italic-serif text-base">発行済みの請求書はまだありません</p>
        </div>
      )}

      <p className="ornament mt-10" />
    </div>
  );
}

function formatPeriod(start: string, end: string): string {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  return `${s.getFullYear()}年${s.getMonth() + 1}月分 — ${s.getMonth() + 1}/${s.getDate()} 〜 ${e.getMonth() + 1}/${e.getDate()}`;
}
