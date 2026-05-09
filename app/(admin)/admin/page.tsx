import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { OrderFilter } from "@/components/admin/OrderFilter";
import { PlateCorner } from "@/components/ui/PlateCorner";
import { StatusDot } from "@/components/ui/StatusDot";
import { Tag } from "@/components/ui/Tag";
import { Emblem } from "@/components/ui/Emblem";
import { Button } from "@/components/ui/Button";

type Props = {
  searchParams: Promise<{ status?: string }>;
};

const ORDER_STATUSES = ["pending", "confirmed", "cancelled", "allocation_pending"] as const;
type OrderStatus = typeof ORDER_STATUSES[number];

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

function formatTime(date: string) {
  const d = new Date(date);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

export default async function AdminDashboard({ searchParams }: Props) {
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(
      `
      id,
      status,
      ordered_at,
      users!orders_buyer_id_fkey!inner ( company_name ),
      order_items (
        quantity,
        allocated_quantity,
        unit_price
      )
    `,
    )
    .order("ordered_at", { ascending: false })
    .limit(50);

  if (status && isOrderStatus(status)) {
    query = query.eq("status", status);
  }

  const { data: orders, error } = await query;

  // KPI counts
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [pendingCount, allocPendingCount, todayRevenue, lowStock] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "allocation_pending"),
    supabase
      .from("orders")
      .select("order_items(unit_price, quantity, allocated_quantity)")
      .gte("ordered_at", todayIso)
      .neq("status", "cancelled"),
    // 在庫 ≤ 3 の販売中商品（割当商品は対象外、希望本数 vs 在庫が独立のため）
    supabase
      .from("products")
      .select("id, name, producer, stock, region, vintage")
      .is("deleted_at", null)
      .eq("is_active", true)
      .eq("status", "published")
      .eq("is_allocation", false)
      .lte("stock", 3)
      .order("stock", { ascending: true })
      .limit(8),
  ]);

  const todayTotal = (todayRevenue.data ?? []).reduce((sum, o) => {
    const items = (o.order_items ?? []) as Array<{
      unit_price: number;
      quantity: number;
      allocated_quantity: number | null;
    }>;
    return (
      sum +
      items.reduce(
        (s, it) => s + it.unit_price * (it.allocated_quantity ?? it.quantity),
        0,
      )
    );
  }, 0);

  return (
    <div className="relative px-10 pt-7 pb-10">
      <PlateCorner number="04" />

      {/* Header */}
      <header className="border-b border-rule pb-5 mb-7">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="caps">Today · Message Box</p>
            <h1 className="font-serif text-5xl mt-2 tracking-tight">メッセージボックス</h1>
            <p className="font-italic-serif mt-1 text-base text-ink-3">
              Today's correspondence — 受信した便り
            </p>
          </div>
          <div className="text-right pr-24">
            <p className="font-italic-serif text-xl text-plate">
              {today.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
            <p className="caps mt-1">
              {new Date().toLocaleString("ja-JP", { dateStyle: "long", timeStyle: "short" })}
            </p>
          </div>
        </div>
      </header>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-0 double-rule mb-10">
        <div className="p-5 border-r border-rule">
          <p className="caps">受付中</p>
          <p className="font-serif text-5xl mt-2 plate-num text-plate">
            {String(pendingCount.count ?? 0).padStart(2, "0")}
          </p>
          <p className="text-xs mt-2 font-italic-serif text-ink-3">確認待ちの新規発注</p>
        </div>
        <div className="p-5 border-r border-rule">
          <p className="caps">割り当て待ち</p>
          <p className="font-serif text-5xl mt-2 plate-num text-amber">
            {String(allocPendingCount.count ?? 0).padStart(2, "0")}
          </p>
          <p className="text-xs mt-2 font-italic-serif text-ink-3">締切後の按分処理</p>
        </div>
        <div className="p-5 border-r border-rule">
          <p className="caps">本日の売上</p>
          <p className="font-serif text-5xl mt-2 plate-num">
            ¥{todayTotal.toLocaleString()}
          </p>
          <p className="text-xs mt-2 font-italic-serif text-ink-3">
            {todayRevenue.data?.length ?? 0} 件
          </p>
        </div>
        <div className="p-5">
          <p className="caps">未読チャット</p>
          <p className="font-serif text-5xl mt-2 plate-num">—</p>
          <p className="text-xs mt-2 font-italic-serif text-ink-3">サイドバーに表示</p>
        </div>
      </div>

      {/* Low-stock signal — 在庫 ≤ 3 の販売中商品があれば横並びで警告 */}
      {lowStock.data && lowStock.data.length > 0 && (
        <section className="mb-10">
          <div className="flex items-baseline justify-between border-b border-rule pb-3.5 mb-4">
            <div>
              <p className="caps text-amber">Plate IV · Low Stock Signal</p>
              <h2 className="font-serif text-2xl mt-1 text-amber">在庫が少ない商品</h2>
            </div>
            <Link href="/admin/products" className="caps text-ink-3 hover:text-plate transition-colors">
              商品台帳へ →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {lowStock.data.map((p) => (
              <Link
                key={p.id}
                href={`/admin/products/${p.id}/edit`}
                className="card-float p-3 hover:border-amber transition-colors group"
              >
                <p className="font-serif text-sm leading-tight truncate">
                  {p.name}
                  {p.vintage && (
                    <span className="text-ink-3 ml-1 plate-num text-xs">{p.vintage}</span>
                  )}
                </p>
                {(p.producer || p.region) && (
                  <p className="caps mt-1 truncate text-ink-3 text-[10px]">
                    {[p.producer, p.region].filter(Boolean).join(" · ")}
                  </p>
                )}
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="caps text-ink-3">残</span>
                  <span className={`font-serif plate-num text-2xl ${p.stock === 0 ? "text-crimson" : "text-amber"}`}>
                    {p.stock}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="ornament my-10" />

      {/* Inbox header */}
      <div className="flex items-baseline justify-between border-b border-rule pb-3.5 mb-5">
        <div>
          <p className="caps">Plate IV · Correspondence</p>
          <h2 className="font-serif text-3xl mt-1">受信した便り</h2>
        </div>
        <Suspense>
          <OrderFilter />
        </Suspense>
      </div>

      {error && (
        <div className="border border-crimson bg-crimson-bg text-crimson text-sm px-4 py-3 mb-4">
          発注の取得に失敗しました。
        </div>
      )}

      {orders && orders.length > 0 ? (
        <table className="w-full">
          <thead>
            <tr className="border-b border-plate">
              <th className="w-8" />
              <th className="text-left py-2.5 caps w-16">時刻</th>
              <th className="text-left py-2.5 caps w-48">差出</th>
              <th className="text-left py-2.5 caps">件名</th>
              <th className="text-right py-2.5 caps w-32">金額</th>
              <th className="w-32" />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const items = (order.order_items ?? []) as Array<{
                unit_price: number;
                quantity: number;
                allocated_quantity: number | null;
              }>;
              const total = items.reduce(
                (s, it) => s + it.unit_price * (it.allocated_quantity ?? it.quantity),
                0,
              );
              const buyer = order.users as { company_name: string } | null;
              const dotVariant: React.ComponentProps<typeof StatusDot>["variant"] =
                order.status === "pending"
                  ? "plate"
                  : order.status === "allocation_pending"
                  ? "amber"
                  : order.status === "cancelled"
                  ? "crimson"
                  : "forest";
              const tagVariant: React.ComponentProps<typeof Tag>["variant"] = dotVariant;
              const tagLabel =
                order.status === "pending"
                  ? "新規発注"
                  : order.status === "allocation_pending"
                  ? "割当待ち"
                  : order.status === "cancelled"
                  ? "キャンセル"
                  : "確定済";
              const isFresh = order.status === "pending";
              const subject = `${buyer?.company_name ?? "—"} · ${items.reduce(
                (s, it) => s + it.quantity,
                0,
              )} 本`;
              return (
                <tr
                  key={order.id}
                  className="border-b border-rule hover:bg-paper-2 transition-colors"
                >
                  <td className="pl-1">
                    <StatusDot variant={dotVariant} pulse={isFresh} />
                  </td>
                  <td className="text-xs font-italic-serif text-ink-3 py-3">
                    {formatTime(order.ordered_at)}
                  </td>
                  <td className="py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="flex items-center gap-3 hover:text-plate"
                    >
                      <Emblem size={28} variant={dotVariant}>
                        {(buyer?.company_name ?? "—").slice(0, 1)}
                      </Emblem>
                      <span className="font-serif tracking-tight">
                        {buyer?.company_name ?? "—"}
                      </span>
                    </Link>
                  </td>
                  <td className="py-3">
                    <Tag variant={tagVariant}>{tagLabel}</Tag>
                    <span className="ml-3 text-sm text-ink-2">{subject}</span>
                  </td>
                  <td className="text-right plate-num text-plate">¥{total.toLocaleString()}</td>
                  <td className="text-right pr-1">
                    <Link href={`/admin/orders/${order.id}`}>
                      <Button variant={isFresh ? "primary" : "default"} size="sm">
                        {isFresh ? "確認 ⏎" : "詳細"}
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="border border-rule bg-paper-2 flex flex-col items-center justify-center py-20 text-ink-3">
          <p className="font-italic-serif text-lg">
            {status ? "該当する発注がありません" : "便りはまだ届いていません"}
          </p>
        </div>
      )}

      <p className="ornament mt-10" />

      <footer className="mt-6 text-xs text-ink-3 flex justify-between">
        <span className="font-italic-serif">
          Mise · 株式会社○○ · 通信販売酒類小売業免許
        </span>
        <span className="caps">Plate № 04 — Message Box</span>
      </footer>
    </div>
  );
}
