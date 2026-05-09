"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Search, X, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import type { Database } from "@/types/database";
import {
  WINE_TYPES,
  WINE_COUNTRIES,
  WINE_REGIONS,
  SAKE_PREFECTURES,
  SHOCHU_PREFECTURES,
} from "@/lib/product-constants";
import { StatusDot, Tag, PlateCorner, Button } from "@/components/ui";

type Product = Database["public"]["Tables"]["products"]["Row"];

const CATEGORIES = ["ワイン", "日本酒", "焼酎", "ジン", "ウイスキー", "その他"];

function remainingLabel(deadline: string | null | undefined) {
  if (!deadline) return "";
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "受付終了";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `残り${d}日${h}時間`;
  if (h > 0) return `残り${h}時間${m}分`;
  return `残り${m}分`;
}

function formatDeadline(deadline: string | null | undefined): string {
  if (!deadline) return "";
  const d = new Date(deadline);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusOf(product: Product) {
  if (product.is_allocation) return "allocation" as const;
  if (product.stock <= 0) return "soldout" as const;
  if (product.stock <= 3) return "low" as const;
  return "instock" as const;
}

export function ProductList({ products }: { products: Product[] }) {
  const { addItem } = useCart();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>(["ワイン"]);
  const [activeCountry, setActiveCountry] = useState("");
  const [activeRegion, setActiveRegion] = useState("");
  const [activeType, setActiveType] = useState("");

  useEffect(() => {
    if (selected) {
      setQuantity(1);
      setJustAdded(false);
    }
  }, [selected]);

  const handleAddToCart = () => {
    if (!selected) return;
    addItem({
      id: selected.id,
      name: selected.name,
      price: selected.price,
      isAllocation: selected.is_allocation,
      allocationDeadline: selected.allocation_deadline,
      quantity,
    });
    setJustAdded(true);
    setTimeout(() => setSelected(null), 400);
  };

  function toggleCategory(cat: string) {
    setOpenCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
    setActiveCategory(cat);
    setActiveCountry("");
    setActiveRegion("");
    setActiveType("");
  }

  const regionList = activeCountry ? WINE_REGIONS[activeCountry] ?? [] : [];

  const filtered = useMemo(() => {
    const now = Date.now();
    return products
      .filter((p) => {
        if (p.is_allocation && p.allocation_deadline) {
          if (new Date(p.allocation_deadline).getTime() <= now) return false;
        }
        if (query.trim()) {
          const q = query.toLowerCase();
          if (
            !p.name.toLowerCase().includes(q) &&
            !(p.producer ?? "").toLowerCase().includes(q) &&
            !(p.region ?? "").toLowerCase().includes(q)
          )
            return false;
        }
        if (activeCategory && p.category !== activeCategory) return false;
        if (activeCountry && p.country !== activeCountry) return false;
        if (activeRegion && p.region !== activeRegion) return false;
        if (activeType && p.type !== activeType) return false;
        return true;
      })
      .sort((a, b) => {
        const aOut = a.stock <= 0 && !a.is_allocation ? 1 : 0;
        const bOut = b.stock <= 0 && !b.is_allocation ? 1 : 0;
        return aOut - bOut;
      });
  }, [products, query, activeCategory, activeCountry, activeRegion, activeType]);

  const prefList = activeCategory === "日本酒" ? SAKE_PREFECTURES : SHOCHU_PREFECTURES;
  const month = new Date().toLocaleDateString("en-US", { month: "long" });

  // 店主の推薦：割当対象の最初、なければ在庫が少ない希少品、それでもなければ先頭
  const featured =
    products.find((p) => p.is_allocation && p.allocation_deadline && new Date(p.allocation_deadline).getTime() > Date.now()) ??
    products.find((p) => p.stock > 0 && p.stock <= 6) ??
    products[0];

  return (
    <div className="flex flex-col h-full relative">
      <PlateCorner number="01" />

      {/* Editorial header */}
      <section className="px-6 lg:px-12 pt-10 pb-8 border-b border-rule">
        <div className="grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-7">
            <p className="caps">No. 17 — {month} · MMXXVI</p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[0.95] tracking-tight mt-3">
              <span className="font-italic-serif text-plate">Cellar,</span>
              <span className="hidden sm:inline"> </span>
              <br className="sm:hidden" />
              <span>今週の入荷より。</span>
            </h1>
            <p className="font-italic-serif mt-3 text-base text-ink-2 max-w-xl">
              Bourgogne / Champagne / Bordeaux / 山形・兵庫の銘酒。希少品はすべて受付制です。
            </p>
          </div>

          {featured && (
            <button
              onClick={() => setSelected(featured)}
              className="lg:col-span-5 text-left bg-paper-2 border border-plate p-5 relative overflow-hidden hover:border-plate-deep transition-colors group"
            >
              <p className="caps text-vermilion mb-2">店主の今月の一本 — Featured</p>
              <p className="font-serif text-2xl tracking-tight leading-tight">
                {featured.name}
              </p>
              {featured.producer && (
                <p className="font-italic-serif text-sm mt-1 text-ink-3">{featured.producer}</p>
              )}
              <div className="hairline-gold w-16 my-3" />
              <p className="font-italic-serif text-sm text-ink-2 leading-relaxed line-clamp-3">
                {featured.comment ??
                  "今期、店主が自信をもって推薦する一本。少量入荷のため、お早めにご注文ください。"}
              </p>
              <div className="mt-3 pt-3 border-t border-rule flex items-baseline justify-between">
                <span className="font-serif text-xl plate-num text-plate">
                  ¥{featured.price.toLocaleString()}
                </span>
                <span className="caps text-ink-3 group-hover:text-plate transition-colors">
                  詳細を見る →
                </span>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* Search */}
      <div className="px-6 lg:px-12 py-4 bg-paper border-b border-rule">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
          <input
            type="text"
            placeholder="生産者・地域・品種で検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-paper-2 border border-rule-strong pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-plate placeholder:text-ink-3"
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-44 lg:w-56 flex-shrink-0 bg-paper border-r border-rule overflow-y-auto scroll px-3 lg:px-4 py-5 hidden md:block">
          <p className="caps mb-3">Category</p>
          {CATEGORIES.map((cat) => {
            const isOpen = openCategories.includes(cat);
            const isActive = activeCategory === cat;
            const hasWineRegions = cat === "ワイン";
            const hasPrefs = cat === "日本酒" || cat === "焼酎";
            return (
              <div key={cat} className="mb-1">
                <button
                  onClick={() => toggleCategory(cat)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 text-sm font-serif tracking-tight text-left transition-colors ${
                    isActive ? "text-plate font-medium" : "text-ink-2 hover:text-plate"
                  }`}
                >
                  <span>— {cat}</span>
                  <span className={`text-xs text-ink-4 transition-transform ${isOpen ? "rotate-90" : ""}`}>
                    ▶
                  </span>
                </button>

                {isOpen && hasWineRegions && (
                  <div className="pb-2 pl-3">
                    <button
                      onClick={() => {
                        setActiveCountry("");
                        setActiveRegion("");
                      }}
                      className={`block w-full text-left px-2 py-1 text-xs font-italic-serif transition-colors ${
                        !activeCountry ? "text-plate" : "text-ink-3 hover:text-ink"
                      }`}
                    >
                      すべて
                    </button>
                    {WINE_COUNTRIES.map((c) => (
                      <div key={c}>
                        <button
                          onClick={() => {
                            setActiveCountry(c);
                            setActiveRegion("");
                          }}
                          className={`block w-full text-left px-2 py-1 text-xs font-italic-serif transition-colors ${
                            activeCountry === c ? "text-plate" : "text-ink-3 hover:text-ink"
                          }`}
                        >
                          {c}
                        </button>
                        {activeCountry === c &&
                          regionList.length > 1 &&
                          regionList.map((r) => (
                            <button
                              key={r}
                              onClick={() => setActiveRegion(r)}
                              className={`block w-full text-left pl-5 pr-2 py-0.5 text-xs font-italic-serif transition-colors ${
                                activeRegion === r ? "text-plate" : "text-ink-4 hover:text-ink-2"
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                      </div>
                    ))}
                  </div>
                )}

                {isOpen && hasPrefs && (
                  <div className="pb-2 pl-3">
                    <button
                      onClick={() => setActiveRegion("")}
                      className={`block w-full text-left px-2 py-1 text-xs font-italic-serif ${
                        !activeRegion ? "text-plate" : "text-ink-3"
                      }`}
                    >
                      すべて
                    </button>
                    {prefList.map((p) => (
                      <button
                        key={p}
                        onClick={() => setActiveRegion(p)}
                        className={`block w-full text-left px-2 py-1 text-xs font-italic-serif ${
                          activeRegion === p ? "text-plate" : "text-ink-3 hover:text-ink"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="hairline-plate my-5" />

          <p className="caps mb-3">Status</p>
          <ul className="space-y-1.5 text-sm text-ink-2">
            <li className="flex items-center gap-2">
              <StatusDot variant="forest" />
              <span className="font-italic-serif">在庫あり</span>
            </li>
            <li className="flex items-center gap-2">
              <StatusDot variant="amber" />
              <span className="font-italic-serif">割当対象</span>
            </li>
            <li className="flex items-center gap-2">
              <StatusDot variant="crimson" />
              <span className="font-italic-serif">残少 / 完売</span>
            </li>
          </ul>
        </aside>

        {/* Main */}
        <div className="flex-1 overflow-y-auto scroll">
          {/* Type filter for wine */}
          {activeCategory === "ワイン" && (
            <div className="flex gap-2 px-6 lg:px-12 py-3 bg-paper border-b border-rule overflow-x-auto scroll">
              {["すべて", ...WINE_TYPES].map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveType(t === "すべて" ? "" : t)}
                  className={`shrink-0 px-3 py-1 text-xs border transition-colors ${
                    (t === "すべて" && !activeType) || activeType === t
                      ? "bg-plate text-paper border-plate"
                      : "border-rule-strong text-ink-2 hover:border-plate hover:text-plate"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* Grid */}
          <div className="p-6 lg:px-12 lg:py-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
            {filtered.length === 0 ? (
              <div className="col-span-full text-center py-20 font-italic-serif text-ink-3">
                {query ? "該当する商品が見つかりません" : "商品がありません"}
              </div>
            ) : (
              filtered.map((product, idx) => {
                const status = statusOf(product);
                const dotVariant =
                  status === "allocation"
                    ? ("amber" as const)
                    : status === "low"
                    ? ("crimson" as const)
                    : status === "soldout"
                    ? ("ink" as const)
                    : ("forest" as const);
                const tagLabel =
                  status === "allocation"
                    ? "allocation"
                    : status === "low"
                    ? "残少"
                    : status === "soldout"
                    ? "sold out"
                    : "in stock";
                const fig = String.fromCharCode(97 + (idx % 26));
                return (
                  <article
                    key={product.id}
                    onClick={() => setSelected(product)}
                    className={`group cursor-pointer ${status === "soldout" ? "opacity-60" : ""}`}
                  >
                    <div className="aspect-[3/4] relative overflow-hidden bg-paper-2 border border-plate">
                      <p className="absolute top-3 left-3 caps text-plate">Fig. ({fig})</p>
                      <p className="absolute top-3 right-3 caps text-plate">№ {String(idx + 1).padStart(2, "0")}</p>
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-7xl opacity-80">🍷</span>
                        </div>
                      )}
                      <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                        <StatusDot variant={dotVariant} />
                        <Tag variant={dotVariant === "ink" ? "default" : dotVariant}>
                          {tagLabel}
                        </Tag>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="caps">
                        {[product.country, product.region].filter(Boolean).join(" · ") || "—"}
                        {product.vintage && ` · ${product.vintage}`}
                      </p>
                      <p className="font-serif text-lg mt-1.5 leading-tight tracking-tight line-clamp-2">
                        {product.name}
                      </p>
                      {product.producer && (
                        <p className="font-italic-serif text-xs mt-1 text-ink-3">{product.producer}</p>
                      )}
                      <div className="mt-3 pt-3 flex items-baseline justify-between border-t border-rule">
                        <p className="font-serif text-lg plate-num text-plate">
                          ¥{product.price.toLocaleString()}
                        </p>
                        {product.is_allocation && product.allocation_deadline ? (
                          <p className="caps text-amber">締切 {formatDeadline(product.allocation_deadline)}</p>
                        ) : status === "low" ? (
                          <p className="caps text-crimson">残 {product.stock}</p>
                        ) : (
                          <p className="caps text-ink-3">在庫 {product.stock}</p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-ink/40 z-50 flex items-end sm:items-center sm:justify-center p-0 sm:p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-paper w-full sm:w-[520px] sm:max-w-lg p-6 max-h-[90vh] overflow-y-auto scroll border border-plate relative"
            onClick={(e) => e.stopPropagation()}
          >
            <PlateCorner number="00" />
            <div className="flex items-start justify-between mb-4 pr-24">
              <div>
                <p className="caps">
                  {[selected.country, selected.region].filter(Boolean).join(" · ") || "—"}
                  {selected.vintage && ` · ${selected.vintage}`}
                </p>
                <h2 className="font-serif text-2xl mt-1 tracking-tight">{selected.name}</h2>
                {selected.producer && (
                  <p className="font-italic-serif text-sm text-ink-3 mt-1">{selected.producer}</p>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1 text-ink-3 hover:text-ink absolute top-4 left-4 sm:left-auto sm:right-4 sm:top-4"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-full aspect-[4/3] bg-paper-2 border border-plate flex items-center justify-center mb-5 overflow-hidden">
              {selected.image_url ? (
                <Image
                  src={selected.image_url}
                  alt={selected.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 480px"
                  className="object-contain"
                />
              ) : (
                <span className="text-6xl">🍷</span>
              )}
            </div>

            <dl className="space-y-1.5 mb-4">
              {selected.category && (
                <div className="flex justify-between text-sm py-1 border-b border-rule">
                  <dt className="caps">カテゴリ</dt>
                  <dd className="font-italic-serif">
                    {selected.category}
                    {selected.type ? ` / ${selected.type}` : ""}
                  </dd>
                </div>
              )}
              {selected.grape_variety && (
                <div className="flex justify-between text-sm py-1 border-b border-rule">
                  <dt className="caps">品種</dt>
                  <dd className="font-italic-serif">{selected.grape_variety}</dd>
                </div>
              )}
              <div className="flex justify-between text-sm py-1 border-b border-rule">
                <dt className="caps">在庫</dt>
                <dd className={`font-italic-serif ${selected.stock <= 0 ? "text-crimson" : ""}`}>
                  {selected.stock > 0 ? `${selected.stock} 本` : "在庫なし"}
                </dd>
              </div>
              <div className="flex justify-between items-baseline text-sm py-2">
                <dt className="caps">価格（税抜）</dt>
                <dd className="font-serif text-2xl plate-num text-plate">
                  ¥{selected.price.toLocaleString()}
                </dd>
              </div>
            </dl>

            {selected.is_allocation && (
              <div className="bg-amber-bg border border-amber px-3 py-3 mb-4">
                <p className="text-xs font-medium text-amber mb-1">⚠ 割り当て対象商品です</p>
                <p className="text-xs text-ink-2 leading-relaxed">
                  ご希望本数を入力してご注文ください。受付期限後にお店から実際の割り当て本数をご連絡します。
                  <span className="font-medium text-ink">キャンセル不可</span>のため、ご不明点はお問い合わせください。
                </p>
                {selected.allocation_deadline && (
                  <p className="text-xs font-medium text-amber mt-2">
                    受付締切：
                    {new Date(selected.allocation_deadline).toLocaleString("ja-JP", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    （{remainingLabel(selected.allocation_deadline)}）
                  </p>
                )}
              </div>
            )}

            {selected.comment && (
              <div className="bg-paper-2 border border-rule px-3 py-3 mb-4">
                <p className="caps mb-1">酒屋からのコメント</p>
                <p className="text-sm text-ink-2 font-italic-serif leading-relaxed">{selected.comment}</p>
              </div>
            )}

            <div className="pt-3 border-t border-rule">
              {selected.stock <= 0 && !selected.is_allocation ? (
                <div className="flex items-center justify-between">
                  <span className="font-serif text-2xl plate-num text-plate">
                    ¥{selected.price.toLocaleString()}
                  </span>
                  <Button disabled size="lg">
                    在庫なし
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="caps">{selected.is_allocation ? "希望本数" : "本数"}</label>
                    <select
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="border border-rule-strong bg-paper px-4 py-2 text-base font-serif plate-num focus:outline-none focus:border-plate min-w-[100px]"
                    >
                      {Array.from({ length: Math.max(selected.stock, 1) }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n} 本
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-rule">
                    <span className="font-serif text-2xl plate-num text-plate">
                      ¥{(selected.price * quantity).toLocaleString()}
                    </span>
                    <Button
                      onClick={handleAddToCart}
                      disabled={justAdded}
                      variant={justAdded ? "default" : selected.is_allocation ? "vermilion" : "primary"}
                      size="lg"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {justAdded
                        ? "追加しました"
                        : selected.is_allocation
                          ? `希望で送る（${quantity}本）`
                          : `カートに入れる（${quantity}本）`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
