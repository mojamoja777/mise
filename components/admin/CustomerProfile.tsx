import { Tag } from "@/components/ui/Tag";
import { Emblem } from "@/components/ui/Emblem";
import type { Database } from "@/types/database";

type Buyer = {
  id: string;
  company_name: string;
  customer_code: string | null;
  address: string | null;
  phone: string | null;
  tier: Database["public"]["Tables"]["users"]["Row"]["tier"];
  taste_tags: string[];
  internal_note: string | null;
  created_at: string;
};

type Stats = {
  amount_30d: number;
  amount_total: number;
  orders_total: number;
  last_ordered_at: string | null;
};

const TIER_VARIANT: Record<Buyer["tier"], React.ComponentProps<typeof Tag>["variant"]> = {
  gold: "amber",
  silver: "default",
  bronze: "default",
};

export function CustomerProfile({
  buyer,
  stats,
  recentActivity = [],
}: {
  buyer: Buyer;
  stats?: Stats | null;
  recentActivity?: Array<{ kind: "ordered" | "paid"; date: string; amount: number }>;
}) {
  const sinceYear = new Date(buyer.created_at).getFullYear();
  const sinceMonth = String(new Date(buyer.created_at).getMonth() + 1).padStart(2, "0");

  return (
    <aside className="w-72 border-l border-rule flex flex-col flex-shrink-0 bg-paper">
      <div className="px-5 pt-5 pb-4 border-b border-rule">
        <p className="caps">Customer · since {sinceYear}.{sinceMonth}</p>
        <div className="flex items-center gap-3 mt-3">
          <Emblem size={40}>{buyer.company_name.slice(0, 1)}</Emblem>
          <div>
            <p className="font-serif text-lg tracking-tight leading-tight">{buyer.company_name}</p>
            {buyer.customer_code && (
              <p className="caps font-mono mt-0.5">{buyer.customer_code}</p>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-6 overflow-y-auto scroll text-xs">
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="caps">Tier</span>
            <Tag variant={TIER_VARIANT[buyer.tier]} className="capitalize">
              {buyer.tier}
            </Tag>
          </div>
          {buyer.phone && (
            <div className="flex justify-between">
              <span className="caps">Phone</span>
              <span className="plate-num">{buyer.phone}</span>
            </div>
          )}
          {buyer.address && (
            <div className="flex justify-between gap-3">
              <span className="caps">Address</span>
              <span className="text-ink-2 text-right">{buyer.address}</span>
            </div>
          )}
        </div>

        {buyer.taste_tags.length > 0 && (
          <div>
            <p className="caps mb-2">Taste profile</p>
            <div className="flex flex-wrap gap-1.5">
              {buyer.taste_tags.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
          </div>
        )}

        {stats && (
          <div>
            <p className="caps mb-2">Stats</p>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="orders / total" value={String(stats.orders_total)} />
              <Stat
                label="last 30 days"
                value={`¥${Math.round(stats.amount_30d / 1000).toLocaleString()}k`}
              />
              <Stat
                label="lifetime"
                value={`¥${Math.round(stats.amount_total / 1000).toLocaleString()}k`}
              />
              <Stat
                label="last order"
                value={
                  stats.last_ordered_at
                    ? new Date(stats.last_ordered_at).toLocaleDateString("ja-JP", {
                        month: "numeric",
                        day: "numeric",
                      })
                    : "—"
                }
              />
            </div>
          </div>
        )}

        {recentActivity.length > 0 && (
          <div>
            <p className="caps mb-2">Recent activity</p>
            <ul className="space-y-1.5">
              {recentActivity.slice(0, 5).map((a, i) => (
                <li key={i} className="flex justify-between">
                  <span className="text-ink-2 font-italic-serif">
                    {new Date(a.date).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}{" "}
                    {a.kind === "ordered" ? "ordered" : "paid"}
                  </span>
                  <span
                    className={`plate-num ${a.kind === "paid" ? "text-forest" : "text-ink"}`}
                  >
                    ¥{a.amount.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {buyer.internal_note && (
          <div>
            <p className="caps mb-2">店主メモ</p>
            <p className="font-italic-serif text-sm text-ink-2 leading-relaxed bg-paper-2 border border-rule p-3">
              {buyer.internal_note}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper-2 border border-rule p-2.5">
      <p className="caps">{label}</p>
      <p className="font-serif text-lg plate-num mt-0.5">{value}</p>
    </div>
  );
}
