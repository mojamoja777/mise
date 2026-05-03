"use client";

import { useState } from "react";
import Link from "next/link";
import type { Database } from "@/types/database";
import {
  CATEGORIES, WINE_TYPES, WINE_COUNTRIES, WINE_REGIONS,
  SAKE_PREFECTURES, SHOCHU_PREFECTURES, ALL_PREFECTURES
} from "@/lib/product-constants";
import { TAX_CLASSES, TAX_LABEL } from "@/lib/tax";

type Product = Database["public"]["Tables"]["products"]["Row"];

type Props = {
  product?: Product;
  action: (formData: FormData) => Promise<{ error: string } | undefined>;
  submitLabel: string;
};

export function ProductForm({ product, action, submitLabel }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAllocation, setIsAllocation] = useState(!!product?.is_allocation);
  const [category, setCategory] = useState(product?.category ?? "");
  const [country, setCountry] = useState(product?.country ?? "");
  const [type, setType] = useState(product?.type ?? "");

  // 既存の allocation_deadline を datetime-local 用のフォーマットに変換
  const formatForDateTimeLocal = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await action(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6B1A35]";
  const selectClass = inputClass;

  const isWine = category === "ワイン";
  const isSake = category === "日本酒";
  const isShochu = category === "焼酎";
  const isJapanese = isSake || isShochu;

  const prefectureList = isSake ? SAKE_PREFECTURES : isShochu ? SHOCHU_PREFECTURES : ALL_PREFECTURES;
  const regionList = isWine && country ? (WINE_REGIONS[country] ?? ["その他"]) : [];

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* カテゴリ */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリ <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="category" value={c} className="sr-only" checked={category === c} onChange={() => setCategory(c)} required />
                <span className={`inline-block px-4 py-2 rounded-full text-sm border transition-colors ${category === c ? "bg-[#6B1A35] text-white border-[#6B1A35]" : "border-gray-200 text-gray-600 hover:border-[#6B1A35]"}`} onClick={() => setCategory(c)}>{c}</span>
              </label>
            ))}
          </div>
        </div>

        {/* タイプ（ワインのみ） */}
        {isWine && (
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">タイプ</label>
            <div className="flex flex-wrap gap-2">
              {WINE_TYPES.map((t) => (
                <label key={t} className="cursor-pointer">
                  <input type="radio" name="type" value={t} className="sr-only" checked={type === t} onChange={() => setType(t)} />
                  <span className={`inline-block px-4 py-2 rounded-full text-sm border transition-colors ${type === t ? "bg-[#6B1A35] text-white border-[#6B1A35]" : "border-gray-200 text-gray-600 hover:border-[#6B1A35]"}`} onClick={() => setType(t)}>{t}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* 国（ワインのみ） */}
        {isWine && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">国</label>
            <select name="country" defaultValue={product?.country ?? ""} onChange={(e) => setCountry(e.target.value)} className={selectClass}>
              <option value="">選択してください</option>
              {WINE_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {/* 地域（ワイン×国選択時） */}
        {isWine && country && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">地域</label>
            <select name="region" defaultValue={product?.region ?? ""} className={selectClass}>
              <option value="">選択してください</option>
              {regionList.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}

        {/* 都道府県（日本酒・焼酎） */}
        {isJapanese && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">都道府県</label>
            <select name="region" defaultValue={product?.region ?? ""} className={selectClass}>
              <option value="">選択してください</option>
              {prefectureList.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}

        {/* 商品名 */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">商品名 <span className="text-red-500">*</span></label>
          <input name="name" type="text" defaultValue={product?.name ?? ""} required className={inputClass} />
        </div>

        {/* 生産者 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">生産者</label>
          <input name="producer" type="text" defaultValue={product?.producer ?? ""} className={inputClass} />
        </div>

        {/* ヴィンテージ（ワインのみ） */}
        {isWine && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ヴィンテージ</label>
            <input name="vintage" type="number" defaultValue={product?.vintage ?? ""} min={1900} max={new Date().getFullYear()} className={inputClass} />
          </div>
        )}

        {/* 品種（ワインのみ） */}
        {isWine && (
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">品種</label>
            <input name="grape_variety" type="text" defaultValue={product?.grape_variety ?? ""} className={inputClass} />
          </div>
        )}

        {/* 価格 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">価格（税抜・円） <span className="text-red-500">*</span></label>
          <input name="price" type="number" defaultValue={product?.price ?? ""} required min={0} step={1} className={inputClass} />
        </div>

        {/* 在庫数 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">在庫数</label>
          <input name="stock" type="number" defaultValue={product?.stock ?? 0} min={0} step={1} className={inputClass} />
        </div>

        {/* 税区分 */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">税区分</label>
          <div className="flex flex-wrap gap-2">
            {TAX_CLASSES.map((tc) => {
              const isSelected = (product?.tax_class ?? "standard") === tc;
              return (
                <label key={tc} className="cursor-pointer">
                  <input
                    type="radio"
                    name="tax_class"
                    value={tc}
                    defaultChecked={isSelected}
                    className="sr-only peer"
                  />
                  <span
                    className={`inline-block px-4 py-2 rounded-full text-sm border transition-colors ${
                      isSelected
                        ? "bg-[#6B1A35] text-white border-[#6B1A35]"
                        : "border-gray-200 text-gray-600 hover:border-[#6B1A35]"
                    }`}
                  >
                    {TAX_LABEL[tc]}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            酒類は標準10%が一般的。ノンアル飲料・食品は軽減8%
          </p>
        </div>

        {/* コメント */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">コメント（酒屋メモ）</label>
          <textarea name="comment" defaultValue={product?.comment ?? ""} rows={3} className={inputClass + " resize-none"} />
        </div>

        {/* 割り当て対象 */}
        <div className="lg:col-span-2">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">割り当て対象にする</p>
                <p className="text-xs text-gray-500 mt-0.5">希少ワイン等の手動配分商品。受付期間中は希望本数のみ受け付け、締切後にオーナーが按分決定します</p>
              </div>
              <button type="button" onClick={() => setIsAllocation(!isAllocation)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAllocation ? "bg-[#6B1A35]" : "bg-gray-300"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAllocation ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            <input type="hidden" name="is_allocation" value={isAllocation ? "true" : "false"} />
            {isAllocation && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  受付締切日時 <span className="text-red-500">*</span>
                </label>
                <input
                  name="allocation_deadline"
                  type="datetime-local"
                  defaultValue={formatForDateTimeLocal(product?.allocation_deadline)}
                  required={isAllocation}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B1A35]"
                />
                <p className="text-xs text-gray-500 mt-1">締切日時を過ぎると新規注文を受け付けません</p>
              </div>
            )}
          </div>
        </div>

        {/* 画像URL */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">画像 URL</label>
          <input name="image_url" type="url" defaultValue={product?.image_url ?? ""} className={inputClass} />
        </div>

        {/* 販売状態 */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">販売状態</label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="is_active" value="true" defaultChecked={product?.is_active !== false} className="accent-[#6B1A35]" />
              <span className="text-sm text-gray-700">販売中</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="is_active" value="false" defaultChecked={product?.is_active === false} className="accent-[#6B1A35]" />
              <span className="text-sm text-gray-700">非表示</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Link href="/admin/products" className="px-6 py-2.5 text-sm font-medium border border-[#6B1A35] text-[#6B1A35] rounded-xl hover:bg-[#FDF4F6] transition-colors">
          キャンセル
        </Link>
        <button type="submit" disabled={loading} className="px-6 py-2.5 text-sm font-medium bg-[#6B1A35] text-white rounded-xl hover:bg-[#9B2D50] disabled:opacity-50 transition-colors">
          {loading ? "保存中..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
