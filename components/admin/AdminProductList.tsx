"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Pencil, MessageSquareText, X } from "lucide-react";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";
import { RestoreProductButton } from "@/components/admin/RestoreProductButton";
import { WINE_TYPES, WINE_COUNTRIES, WINE_REGIONS, SAKE_PREFECTURES, SHOCHU_PREFECTURES } from "@/lib/product-constants";

const CATEGORIES = ["ワイン", "日本酒", "焼酎", "ジン", "ウイスキー", "その他"];

type Product = {
  id: string;
  name: string;
  vintage: number | null;
  producer: string | null;
  region: string | null;
  grape_variety: string | null;
  price: number;
  stock: number;
  image_url: string | null;
  is_active: boolean;
  status: "draft" | "published";
  comment: string | null;
  type: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: any;
};

const WINE_TYPE_COLOR: Record<string, string> = {
  "赤": "bg-rose-50 text-rose-700 border-rose-200",
  "白": "bg-yellow-50 text-amber border-yellow-200",
  "ロゼ": "bg-pink-50 text-pink-700 border-pink-200",
  "オレンジ": "bg-orange-50 text-orange-700 border-orange-200",
  "スパークリング": "bg-sky-50 text-sky-700 border-sky-200",
  "ノンアル": "bg-paper-2 text-ink-2 border-rule",
};

export function AdminProductList({
  products,
  mode = "active",
}: {
  products: Product[];
  mode?: "active" | "archived";
}) {
  const isArchived = mode === "archived";
  const [activeCategory, setActiveCategory] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [activeCountry, setActiveCountry] = useState("");
  const [activeRegion, setActiveRegion] = useState("");
  const [activeType, setActiveType] = useState("");
  const [openCommentProduct, setOpenCommentProduct] = useState<Product | null>(null);
  const [hoverImage, setHoverImage] = useState<{ url: string; alt: string; x: number; y: number } | null>(null);

  function showHoverImage(e: React.MouseEvent<HTMLElement>, url: string, alt: string) {
    const rect = e.currentTarget.getBoundingClientRect();
    const PREVIEW = 576; // w-[576px]（旧 w-72 = 288px の 2 倍）
    const GAP = 12;
    // 右側に出すと画面からはみ出る場合は左側に出す
    let x = rect.right + GAP;
    if (x + PREVIEW > window.innerWidth - 8) {
      x = rect.left - PREVIEW - GAP;
    }
    let y = rect.top + rect.height / 2 - PREVIEW / 2;
    y = Math.max(8, Math.min(window.innerHeight - PREVIEW - 8, y));
    setHoverImage({ url, alt, x, y });
  }

  function toggleCategory(cat: string) {
    setOpenCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
    setActiveCategory(prev => prev === cat ? "" : cat);
    setActiveCountry("");
    setActiveRegion("");
    setActiveType("");
  }

  const regionList = activeCountry ? (WINE_REGIONS[activeCountry] ?? []) : [];
  const prefList = activeCategory === "日本酒" ? SAKE_PREFECTURES : SHOCHU_PREFECTURES;

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (activeCategory && p.category !== activeCategory) return false;
      if (activeCountry && p.country !== activeCountry) return false;
      if (activeRegion && p.region !== activeRegion) return false;
      if (activeType && p.type !== activeType) return false;
      return true;
    }).sort((a, b) => {
      const aOut = a.stock <= 0 ? 1 : 0;
      const bOut = b.stock <= 0 ? 1 : 0;
      return aOut - bOut;
    });
  }, [products, activeCategory, activeCountry, activeRegion, activeType]);

  return (
    <div className="flex gap-6">
      {/* サイドバー */}
      <div className="w-44 flex-shrink-0">
        <div className="card-float overflow-hidden">
          <div className="px-3 py-2.5 bg-paper-2 border-b border-rule">
            <p className="text-xs font-semibold text-ink-3 uppercase tracking-wide">カテゴリ</p>
          </div>
          <button
            onClick={() => { setActiveCategory(""); setOpenCategories([]); setActiveCountry(""); setActiveRegion(""); setActiveType(""); }}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${!activeCategory ? "text-plate font-medium bg-paper-2" : "text-ink-2 hover:bg-paper-2"}`}>
            すべて
          </button>
          {CATEGORIES.map(cat => {
            const isOpen = openCategories.includes(cat);
            const isActive = activeCategory === cat;
            const hasWineRegions = cat === "ワイン";
            const hasPrefs = cat === "日本酒" || cat === "焼酎";
            return (
              <div key={cat} className="border-t border-rule">
                <button onClick={() => toggleCategory(cat)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${isActive ? "text-plate font-medium bg-paper-2" : "text-ink-2 hover:bg-paper-2"}`}>
                  {cat}
                  <span className={`text-xs text-ink-3 transition-transform ${isOpen ? "rotate-90" : ""}`}>▶</span>
                </button>
                {isOpen && hasWineRegions && (
                  <div className="bg-paper-2 pb-1">
                    {WINE_COUNTRIES.map(c => (
                      <div key={c}>
                        <button onClick={() => { setActiveCountry(c === activeCountry ? "" : c); setActiveRegion(""); }}
                          className={`w-full text-left px-5 py-1.5 text-xs transition-colors ${activeCountry === c ? "text-plate font-medium" : "text-ink-3 hover:text-ink"}`}>
                          {c}
                        </button>
                        {activeCountry === c && regionList.length > 1 && regionList.map(r => (
                          <button key={r} onClick={() => setActiveRegion(r === activeRegion ? "" : r)}
                            className={`w-full text-left pl-8 pr-3 py-1 text-xs ${activeRegion === r ? "text-plate font-medium" : "text-ink-3 hover:text-ink-2"}`}>
                            {r}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {isOpen && hasPrefs && (
                  <div className="bg-paper-2 pb-1">
                    {prefList.map(p => (
                      <button key={p} onClick={() => setActiveRegion(p === activeRegion ? "" : p)}
                        className={`w-full text-left px-5 py-1.5 text-xs ${activeRegion === p ? "text-plate font-medium" : "text-ink-3 hover:text-ink"}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1">
        {/* タイプフィルター（ワインのみ） */}
        {activeCategory === "ワイン" && (
          <div className="flex gap-2 flex-wrap mb-4">
            {["すべて", ...WINE_TYPES].map(t => (
              <button key={t} onClick={() => setActiveType(t === "すべて" ? "" : t)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${(t === "すべて" && !activeType) || activeType === t ? "bg-plate text-white border-plate" : "border-rule text-ink-2 hover:border-plate"}`}>
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="card-float overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-ink-3">
              <span className="text-4xl mb-3">🍶</span>
              <p className="text-sm">該当する商品がありません</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-paper-2 border-b border-rule">
                <tr>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide w-14"></th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">商品</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">産地 / 品種</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">価格</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">在庫</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">コメント</th>
                  <th className="px-3 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide text-center">状態</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {filtered.map((product) => {
                  const outOfStock = product.stock <= 0;
                  const isDraft = product.status === "draft";
                  const typeColor = product.type ? WINE_TYPE_COLOR[product.type] : null;
                  const allocationExpired =
                    product.is_allocation &&
                    product.allocation_deadline &&
                    new Date(product.allocation_deadline) < new Date();
                  return (
                    <tr key={product.id} className={`transition-colors ${outOfStock ? "bg-paper-2 opacity-60" : "hover:bg-paper-2"}`}>
                      <td className="px-3 py-3">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="block w-12 h-12 rounded-lg bg-paper-2 overflow-hidden flex items-center justify-center"
                          onMouseEnter={
                            product.image_url
                              ? (e) => showHoverImage(e, product.image_url!, product.name)
                              : undefined
                          }
                          onMouseLeave={() => setHoverImage(null)}
                          title="詳細を見る"
                        >
                          {product.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-ink-4 text-lg">🍶</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="flex items-center gap-1.5 flex-wrap hover:text-plate transition-colors"
                          title="詳細を見る"
                        >
                          {product.type && typeColor && (
                            <span className={`text-[11px] px-1.5 py-0.5 rounded border ${typeColor}`}>{product.type}</span>
                          )}
                          <span className="font-medium text-ink">{product.name}</span>
                          {product.vintage && (
                            <span className="text-xs text-ink-3">{product.vintage}</span>
                          )}
                          {outOfStock && <span className="text-[11px] bg-paper-3 text-ink-3 px-1.5 py-0.5 rounded-full">在庫なし</span>}
                          {product.is_allocation && (
                            <span
                              className={`text-[11px] px-1.5 py-0.5 rounded-full border ${
                                allocationExpired
                                  ? "bg-paper-2 text-ink-3 border-rule"
                                  : "bg-amber-bg text-amber border-amber"
                              }`}
                              title={
                                product.allocation_deadline
                                  ? `締切：${new Date(product.allocation_deadline).toLocaleString("ja-JP")}`
                                  : undefined
                              }
                            >
                              {allocationExpired ? "割当（締切済）" : "割当対象"}
                            </span>
                          )}
                        </Link>
                        {product.producer && (
                          <div className="text-xs text-ink-3 mt-0.5 truncate max-w-[28ch]" title={product.producer}>
                            {product.producer}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-ink-2">
                        <div className="text-sm">{[product.country, product.region].filter(Boolean).join(" / ") || "—"}</div>
                        {product.grape_variety && (
                          <div className="text-xs text-ink-3 truncate max-w-[24ch]" title={product.grape_variety}>
                            {product.grape_variety}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-ink whitespace-nowrap">¥{product.price.toLocaleString()}</td>
                      <td className={`px-3 py-3 text-right font-medium ${outOfStock ? "text-crimson" : "text-ink"}`}>{product.stock}</td>
                      <td className="px-3 py-3 text-center">
                        {product.comment ? (
                          <button
                            type="button"
                            onClick={() => setOpenCommentProduct(product)}
                            aria-label="コメント全文を表示"
                            title={product.comment.slice(0, 60) + (product.comment.length > 60 ? "…" : "")}
                            className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg text-ink-3 hover:text-plate hover:bg-paper-2 transition-colors"
                          >
                            <MessageSquareText className="w-4 h-4" />
                            <span
                              className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-plate"
                              aria-hidden="true"
                            />
                          </button>
                        ) : (
                          <MessageSquareText className="w-4 h-4 mx-auto text-ink-4" aria-hidden="true" />
                        )}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${isDraft ? "bg-paper-2 text-ink-3" : "bg-green-100 text-green-700"}`}>
                            {isDraft ? "下書き" : "公開中"}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${product.is_active ? "bg-amber-bg text-amber" : "bg-paper-2 text-ink-3"}`}>
                            {product.is_active ? "販売中" : "非表示"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {isArchived ? (
                            <RestoreProductButton id={product.id} productName={product.name} />
                          ) : (
                            <>
                              <Link href={`/admin/products/${product.id}/edit`}
                                className="p-2 text-ink-3 hover:text-plate hover:bg-paper-2 rounded-lg transition-colors">
                                <Pencil className="w-4 h-4" />
                              </Link>
                              <DeleteProductButton id={product.id} productName={product.name} />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {openCommentProduct && (
        <CommentDialog
          product={openCommentProduct}
          onClose={() => setOpenCommentProduct(null)}
        />
      )}

      {hoverImage && (
        <div
          className="fixed z-50 pointer-events-none rounded-xl shadow-2xl ring-1 ring-black/10 overflow-hidden bg-white"
          style={{ left: hoverImage.x, top: hoverImage.y }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hoverImage.url}
            alt={hoverImage.alt}
            className="w-[576px] h-[576px] object-contain bg-paper-2"
          />
        </div>
      )}
    </div>
  );
}

function CommentDialog({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="コメント全文"
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-rule">
          <div className="min-w-0">
            <p className="text-xs text-ink-3">コメント</p>
            <p className="text-base font-semibold text-ink truncate">{product.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="p-2 text-ink-3 hover:text-ink-2 hover:bg-paper-2 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">
          <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
            {product.comment}
          </p>
        </div>
        <div className="px-6 py-3 border-t border-rule flex justify-end">
          <Link
            href={`/admin/products/${product.id}/edit`}
            className="text-sm text-plate hover:underline"
          >
            編集ページへ →
          </Link>
        </div>
      </div>
    </div>
  );
}
