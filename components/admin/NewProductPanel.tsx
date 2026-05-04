"use client";

// components/admin/NewProductPanel.tsx
// 新規商品登録ページ用の Client wrapper：
// AI ラベル抽出結果（WineExtractionResult）を Mise の products 型に変換し、
// ProductForm を key 変更で remount してデフォルト値を流し込む。

import { useMemo, useState } from "react";
import { ProductForm } from "@/components/admin/ProductForm";
import AILabelExtractor from "@/components/admin/AILabelExtractor";
import type { WineExtractionResult } from "@/types/wine-extraction";
import type { Database } from "@/types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];

type Props = {
  action: (formData: FormData) => Promise<{ error: string } | undefined>;
};

/**
 * 抽出結果に乗っているがフォームの基本欄に入らない情報（appellation / 認証 / 度数 等）を
 * 1 つのコメント文字列にまとめて products.comment に流す。admin が後で編集する想定。
 */
function buildComment(e: WineExtractionResult): string | null {
  const lines: string[] = [];
  if (e.tasting_note) lines.push(e.tasting_note);
  if (e.appellation) lines.push(`原産地呼称: ${e.appellation}`);
  if (e.alcohol_percent != null) lines.push(`アルコール度数: ${e.alcohol_percent}%`);
  if (e.volume_ml != null) lines.push(`容量: ${e.volume_ml}ml`);
  if (e.certifications && e.certifications.length > 0) {
    lines.push(`認証: ${e.certifications.join(", ")}`);
  }
  if (e.additives && e.additives !== "不明") lines.push(`亜硫酸: ${e.additives}`);
  if (e.filtration && e.filtration !== "不明") lines.push(`濾過: ${e.filtration}`);
  if (e.importer) lines.push(`輸入元: ${e.importer}`);
  if (e.estimated_price_range_jpy) {
    lines.push(`想定小売価格帯: ¥${e.estimated_price_range_jpy}`);
  }
  if (e.type && e.type !== "不明") lines.push(`甘辛: ${e.type}`);
  if (e.notes) lines.push(`備考: ${e.notes}`);
  return lines.length > 0 ? lines.join("\n") : null;
}

/**
 * Mise の ProductForm が想定するワインタイプは「赤 / 白 / ロゼ / スパークリング / オレンジ」。
 * AI スキーマの category（赤/白/ロゼ/スパークリング/オレンジ/酒精強化）から、
 * フォームに合うものだけマップする。
 */
function mapWineType(category: WineExtractionResult["category"]): string | null {
  if (!category) return null;
  if (
    category === "赤" ||
    category === "白" ||
    category === "ロゼ" ||
    category === "スパークリング" ||
    category === "オレンジ"
  ) {
    return category;
  }
  // "酒精強化" は ProductForm の WINE_TYPES に存在しないので未指定
  return null;
}

function parseVintage(v: string | null): number | null {
  if (!v || v === "NV") return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function toProductSeed(extracted: WineExtractionResult): Partial<Product> {
  return {
    name: extracted.wine_name_ja ?? extracted.wine_name_original ?? "",
    producer: extracted.producer,
    region: extracted.region,
    country: extracted.country,
    grape_variety:
      extracted.grape_varieties.length > 0
        ? extracted.grape_varieties.join("、")
        : null,
    vintage: parseVintage(extracted.vintage),
    // AI でカテゴリを取った場合は「ワイン」を仮置き（admin が必要なら変更）
    category: extracted.category ? "ワイン" : null,
    type: mapWineType(extracted.category),
    comment: buildComment(extracted),
  };
}

export function NewProductPanel({ action }: Props) {
  const [seed, setSeed] = useState<Partial<Product> | null>(null);

  // seed が変わるたびに ProductForm を remount して defaultValue を反映する
  const formKey = useMemo(
    () =>
      seed
        ? `${seed.name ?? ""}|${seed.producer ?? ""}|${seed.vintage ?? ""}|${
            seed.region ?? ""
          }`
        : "blank",
    [seed]
  );

  return (
    <>
      <AILabelExtractor
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
