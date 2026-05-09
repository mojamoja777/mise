"use client";

// components/admin/ProductImagesGrid.tsx
// 編集画面で既存画像（product_images）を一覧表示し、メイン切替・削除を実行する。

import { useState, useTransition } from "react";
import { Star, Trash2 } from "lucide-react";
import {
  deleteProductImage,
  setProductMainImage,
} from "@/app/(admin)/admin/products/actions";

export type ExistingImage = {
  id: string;
  storage_url: string;
  is_main: boolean;
  image_role: "main" | "back" | "japanese" | "other";
};

const ROLE_LABEL: Record<ExistingImage["image_role"], string> = {
  main: "表ラベル",
  back: "裏ラベル",
  japanese: "日本語シール",
  other: "その他",
};

type Props = {
  productId: string;
  images: ExistingImage[];
};

export function ProductImagesGrid({ productId, images }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (images.length === 0) {
    return (
      <p className="text-sm text-ink-3">
        登録済み画像はありません。下のフォームから追加できます。
      </p>
    );
  }

  function handleDelete(imageId: string) {
    if (!confirm("この画像を削除します。よろしいですか？")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProductImage(productId, imageId);
      if (result?.error) setError(result.error);
    });
  }

  function handleSetMain(imageId: string) {
    setError(null);
    startTransition(async () => {
      const result = await setProductMainImage(productId, imageId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {images.map((img) => (
          <div
            key={img.id}
            className={`relative rounded-xl border overflow-hidden bg-white ${
              img.is_main
                ? "border-[#1c3a5c] ring-2 ring-[#1c3a5c]/30"
                : "border-rule"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.storage_url}
              alt={ROLE_LABEL[img.image_role]}
              className="w-full h-36 object-cover bg-paper-2"
            />
            <div className="px-2 py-1.5 flex items-center justify-between gap-1">
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                  img.is_main
                    ? "bg-[#1c3a5c] text-white"
                    : "bg-paper-2 text-ink-3"
                }`}
              >
                {img.is_main ? "メイン" : ROLE_LABEL[img.image_role]}
              </span>
              <div className="flex items-center gap-1">
                {!img.is_main && (
                  <button
                    type="button"
                    onClick={() => handleSetMain(img.id)}
                    disabled={pending}
                    aria-label="メインに設定"
                    title="メインに設定"
                    className="p-1.5 rounded-lg text-ink-3 hover:text-[#1c3a5c] hover:bg-[#ddd5c2] disabled:opacity-50"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(img.id)}
                  disabled={pending}
                  aria-label="削除"
                  title="削除"
                  className="p-1.5 rounded-lg text-ink-3 hover:text-crimson hover:bg-crimson-bg disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {error && (
        <p className="text-xs text-crimson">{error}</p>
      )}
    </div>
  );
}
