"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Database } from "@/types/database";
import {
  CATEGORIES, WINE_TYPES, WINE_COUNTRIES, WINE_REGIONS,
  SAKE_PREFECTURES, SHOCHU_PREFECTURES, ALL_PREFECTURES
} from "@/lib/product-constants";
import { TAX_CLASSES, TAX_LABEL } from "@/lib/tax";
import {
  resizeImageForStorage,
  validateImageFile,
} from "@/lib/ai/image-utils";
import {
  ProductImagesGrid,
  type ExistingImage,
} from "@/components/admin/ProductImagesGrid";

type Product = Database["public"]["Tables"]["products"]["Row"];
type ProductStatus = "draft" | "published";

type Props = {
  product?: Product;
  action: (formData: FormData) => Promise<{ error: string } | undefined>;
  /**
   * 新規登録時の事前選択画像（AI ラベル抽出に使ったファイルをそのまま流用）。
   * 親が file state を持っているとき、controlled として双方向に動く。
   */
  images?: File[];
  onImagesChange?: (files: File[]) => void;
  /** 編集対象の既存画像（編集モードで指定） */
  existingImages?: ExistingImage[];
  /** 編集モードで delete/setMain Server Action に渡す ID */
  productId?: string;
};

export function ProductForm({
  product,
  action,
  images,
  onImagesChange,
  existingImages,
  productId,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittingStatus, setSubmittingStatus] = useState<ProductStatus | null>(null);
  const [isAllocation, setIsAllocation] = useState(!!product?.is_allocation);
  const [category, setCategory] = useState(product?.category ?? "");
  const [country, setCountry] = useState(product?.country ?? "");
  const [type, setType] = useState(product?.type ?? "");
  // 新規アップロード対象の画像。images/onImagesChange が来ていれば controlled、
  // それ以外（編集モード等）は内部 state を使う uncontrolled 動作。
  const [internalImages, setInternalImages] = useState<File[]>([]);
  const isControlled = images !== undefined;
  const newImages = isControlled ? images : internalImages;
  const updateNewImages = (next: File[]) => {
    if (isControlled) onImagesChange?.(next);
    else setInternalImages(next);
  };

  // Object URL でプレビュー、unmount 時に revoke
  const newImagePreviews = useMemo(
    () => newImages.map((f) => URL.createObjectURL(f)),
    [newImages]
  );
  useEffect(() => {
    return () => {
      for (const url of newImagePreviews) URL.revokeObjectURL(url);
    };
  }, [newImagePreviews]);

  const formatForDateTimeLocal = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const inputClass = "w-full border border-rule rounded-lg px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-plate";
  const selectClass = inputClass;

  const isWine = category === "ワイン";
  const isSake = category === "日本酒";
  const isShochu = category === "焼酎";
  const isJapanese = isSake || isShochu;

  const prefectureList = isSake ? SAKE_PREFECTURES : isShochu ? SHOCHU_PREFECTURES : ALL_PREFECTURES;
  const regionList = isWine && country ? (WINE_REGIONS[country] ?? ["その他"]) : [];

  const isEdit = !!productId;
  const currentStatus: ProductStatus = product?.status ?? "draft";
  const remainingImageSlots =
    3 - (existingImages?.length ?? 0) - newImages.length;

  async function submitWithStatus(targetStatus: ProductStatus) {
    if (!formRef.current) return;
    if (!formRef.current.checkValidity()) {
      formRef.current.reportValidity();
      return;
    }

    setError(null);
    setSubmittingStatus(targetStatus);

    // 画像のリサイズだけ try/catch で囲む（Server Action の redirect エラーは
    // try/catch で握り潰さない — Next.js が NEXT_REDIRECT として throw するので
    // 通常フローで再 throw させてフレームワークにナビゲーションさせる）
    let formData: FormData;
    try {
      formData = new FormData(formRef.current);
      formData.set("status", targetStatus);
      formData.delete("images");
      for (const file of newImages) {
        const resized = await resizeImageForStorage(file);
        formData.append("images", resized);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "画像の処理に失敗しました。");
      setSubmittingStatus(null);
      return;
    }

    const result = await action(formData);
    // 成功時は redirect で離脱するのでここに来るのはエラー時のみ
    if (result?.error) {
      setError(result.error);
      setSubmittingStatus(null);
    }
  }

  function handleAddImages(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    e.target.value = ""; // 同じファイルを再選択できるようにリセット
    if (selected.length === 0) return;

    const slot = remainingImageSlots;
    if (selected.length > slot) {
      setError(`画像は最大 3 枚までです（残り ${Math.max(0, slot)} 枚）`);
      return;
    }
    for (const file of selected) {
      const v = validateImageFile(file);
      if (!v.valid) {
        setError(v.error || "ファイルが不正です");
        return;
      }
    }
    setError(null);
    updateNewImages([...newImages, ...selected]);
  }

  function handleRemoveNewImage(index: number) {
    updateNewImages(newImages.filter((_, i) => i !== index));
  }

  // ボタンラベル：現在の状態に応じて切り替える
  const draftButtonLabel = isEdit
    ? currentStatus === "draft"
      ? "下書きのまま保存"
      : "非公開にする"
    : "下書き保存";
  const publishButtonLabel = isEdit
    ? currentStatus === "published"
      ? "変更を保存"
      : "公開する"
    : "公開して登録";

  const loading = submittingStatus !== null;

  return (
    <form ref={formRef} className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      {error && (
        <div className="bg-crimson-bg border border-crimson text-crimson text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* 既存画像（編集モードのみ） */}
      {isEdit && existingImages && (
        <div>
          <label className="block text-sm font-medium text-ink-2 mb-2">登録済み画像</label>
          <ProductImagesGrid productId={productId!} images={existingImages} />
        </div>
      )}

      {/* 画像追加 — controlled（新規モード）は AILabelExtractor 側で UI を出すため非表示 */}
      {!isControlled && (
        <div>
          <label className="block text-sm font-medium text-ink-2 mb-2">
            画像を追加（最大 3 枚）
          </label>
          <p className="text-xs text-ink-3 mb-3">
            残り {Math.max(0, remainingImageSlots)} 枚まで追加できます。保存ボタンを押した時にアップロードされます。
          </p>

          {newImagePreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-3">
              {newImagePreviews.map((src, i) => (
                <div
                  key={src}
                  className="relative rounded-xl border border-rule overflow-hidden bg-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`new image ${i + 1}`}
                    className="w-full h-36 object-cover bg-paper-2"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveNewImage(i)}
                    disabled={loading}
                    aria-label="画像を削除"
                    className="absolute top-2 right-2 bg-white/90 rounded-full w-7 h-7 flex items-center justify-center text-ink-2 hover:bg-white disabled:opacity-50 shadow"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {remainingImageSlots > 0 && (
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleAddImages}
              disabled={loading}
              className="block w-full text-sm text-ink-2
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-md file:border-0
                         file:text-sm file:font-semibold
                         file:bg-paper-2 file:text-ink-2
                         hover:file:bg-paper-3
                         disabled:opacity-50"
            />
          )}
        </div>
      )}

      {/* controlled モードでは保存される枚数だけ表示（プレビューは AILabelExtractor 側） */}
      {isControlled && newImages.length > 0 && (
        <div className="text-xs text-ink-3">
          📎 上の AI パネルで選択した {newImages.length} 枚の画像を商品データとして保存します。
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* カテゴリ */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-ink-2 mb-2">カテゴリ <span className="text-crimson">*</span></label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="category" value={c} className="sr-only" checked={category === c} onChange={() => setCategory(c)} required />
                <span className={`inline-block px-4 py-2 rounded-full text-sm border transition-colors ${category === c ? "bg-plate text-white border-plate" : "border-rule text-ink-2 hover:border-plate"}`} onClick={() => setCategory(c)}>{c}</span>
              </label>
            ))}
          </div>
        </div>

        {/* タイプ（ワインのみ） */}
        {isWine && (
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-ink-2 mb-2">タイプ</label>
            <div className="flex flex-wrap gap-2">
              {WINE_TYPES.map((t) => (
                <label key={t} className="cursor-pointer">
                  <input type="radio" name="type" value={t} className="sr-only" checked={type === t} onChange={() => setType(t)} />
                  <span className={`inline-block px-4 py-2 rounded-full text-sm border transition-colors ${type === t ? "bg-plate text-white border-plate" : "border-rule text-ink-2 hover:border-plate"}`} onClick={() => setType(t)}>{t}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* 国（ワインのみ） */}
        {isWine && (
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">国</label>
            <select name="country" defaultValue={product?.country ?? ""} onChange={(e) => setCountry(e.target.value)} className={selectClass}>
              <option value="">選択してください</option>
              {WINE_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {/* 地域（ワイン×国選択時）— 候補リスト + 自由入力 */}
        {isWine && country && (
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">地域</label>
            <input
              name="region"
              type="text"
              list="wine-region-list"
              defaultValue={product?.region ?? ""}
              placeholder="候補から選択 / 自由入力可"
              className={inputClass}
              autoComplete="off"
            />
            <datalist id="wine-region-list">
              {regionList.map((r) => <option key={r} value={r} />)}
            </datalist>
          </div>
        )}

        {/* 都道府県（日本酒・焼酎） */}
        {isJapanese && (
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">都道府県</label>
            <select name="region" defaultValue={product?.region ?? ""} className={selectClass}>
              <option value="">選択してください</option>
              {prefectureList.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}

        {/* 商品名 */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-ink-2 mb-1">商品名 <span className="text-crimson">*</span></label>
          <input name="name" type="text" defaultValue={product?.name ?? ""} required className={inputClass} />
        </div>

        {/* 生産者 */}
        <div>
          <label className="block text-sm font-medium text-ink-2 mb-1">生産者</label>
          <input name="producer" type="text" defaultValue={product?.producer ?? ""} className={inputClass} />
        </div>

        {/* ヴィンテージ（ワインのみ） */}
        {isWine && (
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">ヴィンテージ</label>
            <input name="vintage" type="number" defaultValue={product?.vintage ?? ""} min={1900} max={new Date().getFullYear()} className={inputClass} />
          </div>
        )}

        {/* 品種（ワインのみ） */}
        {isWine && (
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-ink-2 mb-1">品種</label>
            <input name="grape_variety" type="text" defaultValue={product?.grape_variety ?? ""} className={inputClass} />
          </div>
        )}

        {/* 価格 */}
        <div>
          <label className="block text-sm font-medium text-ink-2 mb-1">価格（税抜・円） <span className="text-crimson">*</span></label>
          <input name="price" type="number" defaultValue={product?.price ?? ""} required min={0} step={1} className={inputClass} />
        </div>

        {/* 在庫数 */}
        <div>
          <label className="block text-sm font-medium text-ink-2 mb-1">在庫数</label>
          <input name="stock" type="number" defaultValue={product?.stock ?? 0} min={0} step={1} className={inputClass} />
        </div>

        {/* 税区分 */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-ink-2 mb-2">税区分</label>
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
                        ? "bg-plate text-white border-plate"
                        : "border-rule text-ink-2 hover:border-plate"
                    }`}
                  >
                    {TAX_LABEL[tc]}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-ink-3 mt-1">
            酒類は標準10%が一般的。ノンアル飲料・食品は軽減8%
          </p>
        </div>

        {/* コメント — 新規作成時はラベル抽出フローで AI が自動生成。編集時は自由記述 */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-ink-2 mb-1">コメント（酒屋メモ）</label>
          <textarea
            name="comment"
            defaultValue={product?.comment ?? ""}
            rows={12}
            className={inputClass + " resize-y leading-relaxed"}
            placeholder="テイスティングノート、料理との相性など…"
          />
        </div>

        {/* 割り当て対象 */}
        <div className="lg:col-span-2">
          <div className="bg-paper-2 border border-rule rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-2">割り当て対象にする</p>
                <p className="text-xs text-ink-3 mt-0.5">希少ワイン等の手動配分商品。受付期間中は希望本数のみ受け付け、締切後にオーナーが按分決定します</p>
              </div>
              <button type="button" onClick={() => setIsAllocation(!isAllocation)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAllocation ? "bg-plate" : "bg-gray-300"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAllocation ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            <input type="hidden" name="is_allocation" value={isAllocation ? "true" : "false"} />
            {isAllocation && (
              <div className="mt-3 pt-3 border-t border-rule">
                <label className="block text-sm font-medium text-ink-2 mb-1">
                  受付締切日時 <span className="text-crimson">*</span>
                </label>
                <input
                  name="allocation_deadline"
                  type="datetime-local"
                  defaultValue={formatForDateTimeLocal(product?.allocation_deadline)}
                  required={isAllocation}
                  className="border border-rule rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-plate"
                />
                <p className="text-xs text-ink-3 mt-1">締切日時を過ぎると新規注文を受け付けません</p>
              </div>
            )}
          </div>
        </div>

        {/* 画像URL（外部 URL を使う場合のみ。通常は上の画像アップロードを使う） */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-ink-2 mb-1">画像 URL（任意・外部リンク）</label>
          <input name="image_url" type="url" defaultValue={product?.image_url ?? ""} className={inputClass} />
          <p className="text-xs text-ink-3 mt-1">画像をアップロードしている場合は空欄で OK。アップロード画像が優先されます。</p>
        </div>

        {/* 販売状態 */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-ink-2 mb-2">販売状態</label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="is_active" value="true" defaultChecked={product?.is_active !== false} className="accent-plate" />
              <span className="text-sm text-ink-2">販売中</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="is_active" value="false" defaultChecked={product?.is_active === false} className="accent-plate" />
              <span className="text-sm text-ink-2">非表示</span>
            </label>
          </div>
        </div>
      </div>

      {/* status は送信時に上書きするのでダミー初期値 */}
      <input type="hidden" name="status" value={currentStatus} />

      <div className="flex justify-end gap-3 pt-2">
        <Link
          href="/admin/products"
          className="px-6 py-2.5 text-sm font-medium border border-rule text-ink-2 rounded-xl hover:bg-paper-2 transition-colors"
        >
          キャンセル
        </Link>
        <button
          type="button"
          onClick={() => submitWithStatus("draft")}
          disabled={loading}
          className="px-6 py-2.5 text-sm font-medium border border-plate text-plate rounded-xl hover:bg-paper-2 disabled:opacity-50 transition-colors"
        >
          {submittingStatus === "draft" ? "保存中..." : draftButtonLabel}
        </button>
        <button
          type="button"
          onClick={() => submitWithStatus("published")}
          disabled={loading}
          className="px-6 py-2.5 text-sm font-medium bg-plate text-white rounded-xl hover:bg-plate-deep disabled:opacity-50 transition-colors shadow-sm"
        >
          {submittingStatus === "published" ? "保存中..." : publishButtonLabel}
        </button>
      </div>
    </form>
  );
}
