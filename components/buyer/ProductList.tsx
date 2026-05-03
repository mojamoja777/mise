"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Search, X, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import type { Database } from "@/types/database";
import { WINE_TYPES, WINE_COUNTRIES, WINE_REGIONS, SAKE_PREFECTURES, SHOCHU_PREFECTURES } from "@/lib/product-constants";

type Product = Database["public"]["Tables"]["products"]["Row"] & {
  country?: string | null;
  comment?: string | null;
  category?: string | null;
  type?: string | null;
};

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

  // モーダルを開いた時に数量を1にリセット
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
    // モーダルを閉じる
    setTimeout(() => setSelected(null), 400);
  };

  function toggleCategory(cat: string) {
    setOpenCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
    setActiveCategory(cat);
    setActiveCountry("");
    setActiveRegion("");
    setActiveType("");
  }

  const regionList = activeCountry ? (WINE_REGIONS[activeCountry] ?? []) : [];

  const filtered = useMemo(() => {
    const now = Date.now();
    return products
      .filter(p => {
        // 割り当て対象で受付締切を過ぎたものは非表示
        if (p.is_allocation && p.allocation_deadline) {
          if (new Date(p.allocation_deadline).getTime() <= now) return false;
        }
        if (query.trim()) {
          const q = query.toLowerCase();
          if (!p.name.toLowerCase().includes(q) &&
            !(p.producer ?? "").toLowerCase().includes(q) &&
            !(p.region ?? "").toLowerCase().includes(q)) return false;
        }
        const cat = (p as any).category;
        if (activeCategory && cat !== activeCategory) return false;
        if (activeCountry && p.country !== activeCountry) return false;
        if (activeRegion && p.region !== activeRegion) return false;
        if (activeType && (p as any).type !== activeType) return false;
        return true;
      })
      .sort((a, b) => {
        // 割り当て商品は在庫切れでも注文可能なので「在庫切れ」としない
        const aOut = a.stock <= 0 && !a.is_allocation ? 1 : 0;
        const bOut = b.stock <= 0 && !b.is_allocation ? 1 : 0;
        return aOut - bOut;
      });
  }, [products, query, activeCategory, activeCountry, activeRegion, activeType]);

  const prefList = activeCategory === "日本酒" ? SAKE_PREFECTURES : SHOCHU_PREFECTURES;

  return (
    <div className="flex flex-col h-full">
      {/* 検索バー */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="商品を検索..." value={query} onChange={(e) => setQuery(e.target.value)}
            className="w-full border border-gray-200 rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B1A35] bg-gray-50" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー */}
        <div className="w-40 lg:w-48 flex-shrink-0 bg-white border-r border-gray-100 overflow-y-auto">
          {CATEGORIES.map(cat => {
            const isOpen = openCategories.includes(cat);
            const isActive = activeCategory === cat;
            const hasWineRegions = cat === "ワイン";
            const hasPrefs = cat === "日本酒" || cat === "焼酎";
            return (
              <div key={cat}>
                <button
                  onClick={() => toggleCategory(cat)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-colors text-left ${isActive ? "text-[#6B1A35]" : "text-gray-700 hover:bg-gray-50"}`}>
                  {cat}
                  <span className={`text-xs text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`}>▶</span>
                </button>

                {isOpen && hasWineRegions && (
                  <div className="pb-2">
                    <button onClick={() => { setActiveCountry(""); setActiveRegion(""); }}
                      className={`w-full text-left px-4 py-1.5 text-xs transition-colors ${!activeCountry ? "text-[#6B1A35] font-medium" : "text-gray-500 hover:text-gray-800"}`}>
                      すべて
                    </button>
                    {WINE_COUNTRIES.map(c => (
                      <div key={c}>
                        <button onClick={() => { setActiveCountry(c); setActiveRegion(""); }}
                          className={`w-full text-left px-4 py-1.5 text-xs transition-colors ${activeCountry === c ? "text-[#6B1A35] font-medium" : "text-gray-500 hover:text-gray-800"}`}>
                          {c}
                        </button>
                        {activeCountry === c && regionList.length > 1 && regionList.map(r => (
                          <button key={r} onClick={() => setActiveRegion(r)}
                            className={`w-full text-left pl-7 pr-3 py-1 text-xs transition-colors ${activeRegion === r ? "text-[#6B1A35] font-medium" : "text-gray-400 hover:text-gray-700"}`}>
                            {r}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {isOpen && hasPrefs && (
                  <div className="pb-2">
                    <button onClick={() => setActiveRegion("")}
                      className={`w-full text-left px-4 py-1.5 text-xs ${!activeRegion ? "text-[#6B1A35] font-medium" : "text-gray-500"}`}>
                      すべて
                    </button>
                    {prefList.map(p => (
                      <button key={p} onClick={() => setActiveRegion(p)}
                        className={`w-full text-left px-4 py-1.5 text-xs ${activeRegion === p ? "text-[#6B1A35] font-medium" : "text-gray-500 hover:text-gray-800"}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* メイン */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* タイプフィルター（ワインのみ） */}
          {activeCategory === "ワイン" && (
            <div className="flex gap-2 px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto scrollbar-none">
              {["すべて", ...WINE_TYPES].map(t => (
                <button key={t} onClick={() => setActiveType(t === "すべて" ? "" : t)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors ${(t === "すべて" && !activeType) || activeType === t ? "bg-[#6B1A35] text-white border-[#6B1A35]" : "border-gray-200 text-gray-600 hover:border-[#6B1A35]"}`}>
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* グリッド */}
          <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.length === 0 ? (
              <div className="col-span-full text-center py-20 text-gray-400 text-sm">
                {query ? "該当する商品が見つかりません" : "商品がありません"}
              </div>
            ) : filtered.map(product => {
              const outOfStock = product.stock <= 0 && !product.is_allocation;
              return (
                <div key={product.id}
                  onClick={() => setSelected(product)}
                  className={`bg-white rounded-xl border overflow-hidden cursor-pointer transition-all hover:shadow-md ${outOfStock ? "border-gray-100 opacity-50" : "border-gray-100"}`}>
                  <div className="relative aspect-square bg-[#FDF4F6] flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-3xl">🍷</span>
                    )}
                    {product.is_allocation && (
                      <span className="absolute top-2 left-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium border border-amber-200">
                        割当対象
                      </span>
                    )}
                    {outOfStock && (
                      <span className="absolute top-2 left-2 text-xs bg-black/40 text-white px-2 py-0.5 rounded-full">在庫なし</span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium text-gray-900 leading-tight line-clamp-2">{product.name}{product.vintage ? ` ${product.vintage}` : ""}</p>
                    <p className="text-xs text-gray-400 mt-1 truncate">{[product.country, product.region].filter(Boolean).join(" / ") || "—"}</p>
                    <p className="text-sm font-bold text-[#3B0A1E] mt-1.5">¥{product.price.toLocaleString()}</p>
                    {product.is_allocation && product.allocation_deadline && (
                      <p className="text-[10px] text-amber-700 mt-1">
                        締切 {formatDeadline(product.allocation_deadline)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 詳細モーダル */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center p-0 sm:p-4" onClick={() => setSelected(null)}>
          <div className="bg-white w-full sm:w-[480px] sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                {selected.vintage && <p className="text-sm text-gray-500">{selected.vintage}年</p>}
              </div>
              <button onClick={() => setSelected(null)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="relative w-full aspect-[4/3] rounded-2xl bg-[#FDF4F6] flex items-center justify-center mb-4 overflow-hidden">
              {selected.image_url ? (
                <Image
                  src={selected.image_url}
                  alt={selected.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 480px"
                  className="object-contain"
                />
              ) : <span className="text-6xl">🍷</span>}
            </div>
            <div className="space-y-2 mb-4">
              {(selected as any).category && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">カテゴリ</span>
                  <span className="text-gray-900">{(selected as any).category}{(selected as any).type ? ` / ${(selected as any).type}` : ""}</span>
                </div>
              )}
              {(selected.country || selected.region) && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">産地</span>
                  <span className="text-gray-900">{[selected.country, selected.region].filter(Boolean).join(" / ")}</span>
                </div>
              )}
              {selected.producer && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">生産者</span>
                  <span className="text-gray-900">{selected.producer}</span>
                </div>
              )}
              {selected.grape_variety && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">品種</span>
                  <span className="text-gray-900">{selected.grape_variety}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">在庫</span>
                <span className={selected.stock <= 0 ? "text-red-500" : "text-gray-900"}>
                  {selected.stock > 0 ? `${selected.stock}本` : "在庫なし"}
                </span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-500">価格（税抜）</span>
                <span className="text-lg font-bold text-[#3B0A1E]">¥{selected.price.toLocaleString()}</span>
              </div>
            </div>
            {selected.is_allocation && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-xs font-semibold text-amber-900 mb-1">
                  ⚠ 割り当て対象商品です
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  ご希望本数を入力してご注文ください。受付期限後にお店から実際の割り当て本数をご連絡します。
                  <span className="font-semibold">キャンセル不可</span>のため、ご不明点はお問い合わせください。
                </p>
                {selected.allocation_deadline && (
                  <p className="text-xs font-bold text-amber-900 mt-2">
                    受付締切：
                    {new Date(selected.allocation_deadline).toLocaleString("ja-JP", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}（{remainingLabel(selected.allocation_deadline)}）
                  </p>
                )}
              </div>
            )}
            {(selected as any).comment && (
              <div className="bg-gray-50 rounded-xl p-3 mb-4">
                <p className="text-xs text-gray-500 font-medium mb-1">酒屋からのコメント</p>
                <p className="text-sm text-gray-700">{(selected as any).comment}</p>
              </div>
            )}
            {/* 数量選択・カート追加 */}
            <div className="pt-3 border-t border-gray-100">
              {selected.stock <= 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-[#3B0A1E]">
                    ¥{selected.price.toLocaleString()}
                  </span>
                  <button
                    disabled
                    className="bg-gray-200 text-gray-400 px-6 py-3 rounded-full text-sm cursor-not-allowed"
                  >
                    在庫なし
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      {selected.is_allocation ? "希望本数" : "本数"}
                    </label>
                    <select
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="border border-gray-200 rounded-lg px-4 py-2 text-base font-semibold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#6B1A35] min-w-[100px]"
                    >
                      {Array.from({ length: selected.stock }, (_, i) => i + 1).map(
                        (n) => (
                          <option key={n} value={n}>
                            {n} 本
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-lg font-bold text-[#3B0A1E]">
                      ¥{(selected.price * quantity).toLocaleString()}
                    </span>
                    <button
                      onClick={handleAddToCart}
                      disabled={justAdded}
                      className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white transition-colors ${
                        justAdded
                          ? "bg-green-500"
                          : selected.is_allocation
                            ? "bg-amber-600 hover:bg-amber-700"
                            : "bg-[#6B1A35] hover:bg-[#9B2D50]"
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {justAdded
                        ? "追加しました"
                        : selected.is_allocation
                          ? `希望で送る（${quantity}本）`
                          : `カートに入れる（${quantity}本）`}
                    </button>
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
