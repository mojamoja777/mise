// app/(admin)/admin/allocations/page.tsx
// 管理者 - 割り当て待ち一覧（商品別に集計）

import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PlateCorner, Tag } from "@/components/ui";

type PendingItem = {
  id: string;
  quantity: number;
  product_id: string;
  orders: { status: string; ordered_at: string } | null;
  products: {
    id: string;
    name: string;
    producer: string | null;
    vintage: number | null;
    stock: number;
    allocation_deadline: string | null;
  } | null;
};

type ProductSummary = {
  productId: string;
  name: string;
  producer: string | null;
  vintage: number | null;
  stock: number;
  deadline: string | null;
  requestCount: number;
  totalRequested: number;
  oldestOrderedAt: string;
};

export default async function AdminAllocationsPage() {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("order_items")
    .select(
      `
      id,
      quantity,
      product_id,
      orders!inner ( status, ordered_at ),
      products!inner ( id, name, producer, vintage, stock, allocation_deadline )
    `,
    )
    .eq("orders.status", "allocation_pending")
    .is("allocated_quantity", null)
    .is("products.deleted_at", null);

  const items = (rows ?? []) as unknown as PendingItem[];

  const summaryMap = new Map<string, ProductSummary>();
  for (const item of items) {
    if (!item.products || !item.orders) continue;
    const key = item.products.id;
    const existing = summaryMap.get(key);
    if (existing) {
      existing.requestCount += 1;
      existing.totalRequested += item.quantity;
      if (item.orders.ordered_at < existing.oldestOrderedAt) {
        existing.oldestOrderedAt = item.orders.ordered_at;
      }
    } else {
      summaryMap.set(key, {
        productId: item.products.id,
        name: item.products.name,
        producer: item.products.producer,
        vintage: item.products.vintage,
        stock: item.products.stock,
        deadline: item.products.allocation_deadline,
        requestCount: 1,
        totalRequested: item.quantity,
        oldestOrderedAt: item.orders.ordered_at,
      });
    }
  }

  const summaries = Array.from(summaryMap.values()).sort((a, b) => {
    const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    if (aDeadline !== bDeadline) return aDeadline - bDeadline;
    return a.oldestOrderedAt.localeCompare(b.oldestOrderedAt);
  });

  const now = Date.now();

  return (
    <div className="px-10 pt-7 pb-10 relative">
      <PlateCorner number="05" />

      <header className="border-b border-rule pb-5 mb-7">
        <p className="caps">Plate V · Allocations</p>
        <h1 className="font-serif text-5xl mt-2 tracking-tight">割り当て</h1>
        <p className="font-italic-serif text-base mt-2 text-ink-3 max-w-2xl">
          希少商品の按分待ち一覧。締切後に各飲食店への配分本数を決定します。
        </p>
      </header>

      {error && (
        <div className="bg-crimson-bg border border-crimson text-crimson text-sm px-4 py-3 mb-4">
          割り当て一覧の取得に失敗しました。
        </div>
      )}

      {summaries.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-plate">
              <th className="text-left py-3 caps">商品</th>
              <th className="text-left py-3 caps w-56">受付締切</th>
              <th className="text-right py-3 caps w-20">在庫</th>
              <th className="text-right py-3 caps w-28">希望合計</th>
              <th className="text-right py-3 caps w-24">件数</th>
              <th className="w-28" />
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => {
              const expired = s.deadline ? new Date(s.deadline).getTime() <= now : false;
              const overSubscribed = s.totalRequested > s.stock;
              return (
                <tr key={s.productId} className="border-b border-rule hover:bg-paper-2 transition-colors">
                  <td className="py-3.5">
                    <Link
                      href={`/admin/allocations/${s.productId}`}
                      className="font-serif tracking-tight text-ink hover:text-plate"
                    >
                      {s.name}
                      {s.vintage && (
                        <span className="font-italic-serif text-ink-3 ml-2">{s.vintage}</span>
                      )}
                    </Link>
                    {s.producer && (
                      <p className="font-italic-serif text-xs text-ink-3 mt-0.5">{s.producer}</p>
                    )}
                  </td>
                  <td className="py-3.5 text-xs text-ink-2">
                    {s.deadline ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="plate-num">
                          {new Date(s.deadline).toLocaleString("ja-JP", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {expired ? <Tag variant="crimson">受付終了</Tag> : <Tag variant="plate">受付中</Tag>}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-right plate-num">{s.stock}</td>
                  <td className="text-right">
                    <span className={`plate-num ${overSubscribed ? "text-crimson" : "text-ink-2"}`}>
                      {s.totalRequested}
                    </span>
                    {overSubscribed && (
                      <p className="caps text-crimson mt-0.5" style={{ fontSize: 9 }}>
                        在庫超過
                      </p>
                    )}
                  </td>
                  <td className="text-right plate-num text-ink-2">{s.requestCount}件</td>
                  <td className="text-right">
                    <Link
                      href={`/admin/allocations/${s.productId}`}
                      className="inline-flex items-center gap-1 text-plate text-xs hover:underline font-italic-serif"
                    >
                      按分する
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="bg-paper-2 border border-rule flex flex-col items-center justify-center py-20 text-ink-3">
          <Sparkles className="w-10 h-10 mb-3" />
          <p className="font-italic-serif text-base">割り当て待ちの注文はありません</p>
        </div>
      )}

      <p className="ornament mt-10" />
    </div>
  );
}
