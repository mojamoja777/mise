"use client";

// components/admin/NewProductPanel.tsx
// 新規商品登録ページ用の Client wrapper：
// 写真→AI 抽出器の結果を ProductForm に流し込む（key 変更で remount）

import { useMemo, useState } from "react";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductPhotoExtractor } from "@/components/admin/ProductPhotoExtractor";
import type { ExtractedProduct } from "@/lib/ai/extract-product";
import type { Database } from "@/types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];

type Props = {
  action: (formData: FormData) => Promise<{ error: string } | undefined>;
};

/**
 * AI 抽出結果は category/type/country の enum が緩いので、ProductForm 側の Row 型に
 * 適合する形に詰め替える。ヴィンテージは int、その他は string | null。
 */
function toProductSeed(extracted: ExtractedProduct): Partial<Product> {
  return {
    name: extracted.name ?? "",
    producer: extracted.producer,
    region: extracted.region,
    country: extracted.country,
    grape_variety: extracted.grape_variety,
    vintage: extracted.vintage,
    category: extracted.category,
    type: extracted.type,
    comment: extracted.comment,
  };
}

export function NewProductPanel({ action }: Props) {
  const [seed, setSeed] = useState<Partial<Product> | null>(null);

  // seed が更新されたら ProductForm を remount して defaultValue を反映する
  const formKey = useMemo(
    () =>
      seed
        ? `${seed.name ?? ""}|${seed.producer ?? ""}|${seed.vintage ?? ""}`
        : "blank",
    [seed]
  );

  return (
    <>
      <ProductPhotoExtractor
        onExtracted={(data) => setSeed(toProductSeed(data))}
      />
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <ProductForm
          key={formKey}
          product={seed ? (seed as Product) : undefined}
          action={action}
          submitLabel="登録する"
        />
      </div>
    </>
  );
}
