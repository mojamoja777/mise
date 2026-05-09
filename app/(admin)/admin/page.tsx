// app/(admin)/admin/page.tsx
// 管理者 - ダッシュボード
// 注文の確認は /admin/orders へ。ここは「概況」と将来の経営判断ウィジェット用。

import Link from "next/link";
import { TrendingUp, BarChart3, PieChart, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PlateCorner } from "@/components/ui/PlateCorner";

export default async function AdminDashboard() {
  const supabase = await createClient();

  // 概況用 KPI
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
            <p className="caps">Today · Dashboard</p>
            <h1 className="font-serif text-5xl mt-2 tracking-tight">ダッシュボード</h1>
            <p className="font-italic-serif mt-1 text-base text-ink-3">
              本日の概況と経営指標
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

      {/* Stats strip — 当日の概況 */}
      <div className="grid grid-cols-4 gap-0 double-rule mb-10">
        <Link
          href="/admin/orders?status=pending"
          className="p-5 border-r border-rule hover:bg-paper-2 transition-colors"
        >
          <p className="caps">受付中</p>
          <p className="font-serif text-5xl mt-2 plate-num text-plate">
            {String(pendingCount.count ?? 0).padStart(2, "0")}
          </p>
          <p className="text-xs mt-2 font-italic-serif text-ink-3">確認待ちの新規発注 →</p>
        </Link>
        <Link
          href="/admin/allocations"
          className="p-5 border-r border-rule hover:bg-paper-2 transition-colors"
        >
          <p className="caps">割り当て待ち</p>
          <p className="font-serif text-5xl mt-2 plate-num text-amber">
            {String(allocPendingCount.count ?? 0).padStart(2, "0")}
          </p>
          <p className="text-xs mt-2 font-italic-serif text-ink-3">締切後の按分処理 →</p>
        </Link>
        <div className="p-5 border-r border-rule">
          <p className="caps">本日の売上</p>
          <p className="font-serif text-5xl mt-2 plate-num">
            ¥{todayTotal.toLocaleString()}
          </p>
          <p className="text-xs mt-2 font-italic-serif text-ink-3">
            {todayRevenue.data?.length ?? 0} 件
          </p>
        </div>
        <Link
          href="/admin/chat"
          className="p-5 hover:bg-paper-2 transition-colors"
        >
          <p className="caps">未読チャット</p>
          <p className="font-serif text-5xl mt-2 plate-num">—</p>
          <p className="text-xs mt-2 font-italic-serif text-ink-3">サイドバーに表示 →</p>
        </Link>
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

      {/* 経営指標プレースホルダ — 将来 BI ウィジェットを並べる空き地 */}
      <section className="mb-10">
        <div className="border-b border-rule pb-3.5 mb-5">
          <p className="caps">Plate IV · Business Intelligence</p>
          <h2 className="font-serif text-3xl mt-1 tracking-tight">経営指標</h2>
          <p className="font-italic-serif text-sm mt-1 text-ink-3">
            判断材料になる数値・傾向を集約します（順次追加予定）
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: TrendingUp, title: "月次売上推移", desc: "過去 12 ヶ月の月次売上をグラフで表示" },
            { icon: PieChart, title: "顧客別売上構成", desc: "tier × 売上シェア、上位飲食店ランキング" },
            { icon: BarChart3, title: "商品別回転率", desc: "在庫回転日数、滞留商品の特定" },
            { icon: Activity, title: "割当オペレーション", desc: "希望比 vs 実割当、店別の充足率" },
          ].map((w) => (
            <div
              key={w.title}
              className="card-float p-5 opacity-60 border-dashed"
              aria-disabled="true"
            >
              <w.icon className="w-5 h-5 text-plate" />
              <p className="font-serif text-base mt-3 tracking-tight">{w.title}</p>
              <p className="font-italic-serif text-xs mt-1 text-ink-3 leading-relaxed">
                {w.desc}
              </p>
              <p className="caps text-[10px] mt-3 text-ink-4">Coming soon</p>
            </div>
          ))}
        </div>
      </section>

      <p className="ornament mt-10" />

      <footer className="mt-6 text-xs text-ink-3 flex justify-between">
        <span className="font-italic-serif">
          Mise · 株式会社○○ · 通信販売酒類小売業免許
        </span>
        <span className="caps">Plate № 04 — Dashboard</span>
      </footer>
    </div>
  );
}
