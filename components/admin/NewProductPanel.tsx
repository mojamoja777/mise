"use client";

// components/admin/NewProductPanel.tsx
// 新規商品登録ページ用の Client wrapper：
// AI ラベル抽出結果（WineExtractionResult）を Mise の products 型に変換し、
// ProductForm を key 変更で remount してデフォルト値を流し込む。

import { useCallback, useMemo, useState } from "react";
import { ProductForm } from "@/components/admin/ProductForm";
import AILabelExtractor from "@/components/admin/AILabelExtractor";
import type { WineExtractionResult } from "@/types/wine-extraction";
import type { Database } from "@/types/database";
import { WINE_COUNTRIES, WINE_REGIONS } from "@/lib/product-constants";

type Product = Database["public"]["Tables"]["products"]["Row"];

type Props = {
  action: (formData: FormData) => Promise<{ error: string } | undefined>;
};

/**
 * generate-comment 失敗時のフォールバック。AI 抽出時の tasting_note を素直に返す。
 * 通常は NewProductPanel が /api/ai/generate-comment で取得する polished comment が優先される。
 */
function fallbackComment(e: WineExtractionResult): string | null {
  return e.tasting_note ?? null;
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

/**
 * AI が "France" や "フランス共和国" 等で返してきても WINE_COUNTRIES の値に揃える。
 * 一致しなければ null（select は未選択のまま）。
 */
function normalizeCountry(country: string | null): string | null {
  if (!country) return null;
  const cleaned = country.trim();
  // 完全一致
  if ((WINE_COUNTRIES as readonly string[]).includes(cleaned)) return cleaned;
  // 部分一致（最長優先）
  const sorted = [...WINE_COUNTRIES]
    .filter((c) => c !== "その他")
    .sort((a, b) => b.length - a.length);
  for (const c of sorted) {
    if (cleaned.includes(c)) return c;
  }
  // よくある英語表記の救済
  const aliases: Record<string, string> = {
    France: "フランス",
    Italy: "イタリア",
    Spain: "スペイン",
    Germany: "ドイツ",
    Austria: "オーストリア",
    Portugal: "ポルトガル",
    Japan: "日本",
    USA: "アメリカ",
    "United States": "アメリカ",
    Chile: "チリ",
    Australia: "オーストラリア",
    "New Zealand": "ニュージーランド",
    Hungary: "ハンガリー",
    Greece: "ギリシャ",
    Georgia: "ジョージア",
  };
  for (const [alias, target] of Object.entries(aliases)) {
    if (cleaned.toLowerCase().includes(alias.toLowerCase())) return target;
  }
  return null;
}

/**
 * AI 抽出の region を WINE_REGIONS の代表値に正規化（候補にあれば寄せる）。
 * 部分一致（最長優先）→ 既知サブリージョン別名 → 候補に無ければ AI の生文字列をそのまま返す。
 * フォーム側は datalist + free-text input なので、未知の地域もそのまま保存できる。
 */
function normalizeRegion(
  country: string | null,
  region: string | null
): string | null {
  if (!region) return null;
  const candidates = country ? WINE_REGIONS[country] : null;
  if (!candidates || candidates.length === 0) return null;

  const cleaned = region.trim().replace(/[（(].*?[）)]/g, "").trim();
  if (!cleaned) return null;

  const known = candidates.filter((r) => r !== "その他");

  // 1. 完全一致
  if (known.includes(cleaned)) return cleaned;

  // 2. region 名が抽出文字列に含まれる（最長優先）
  const longest = [...known].sort((a, b) => b.length - a.length);
  for (const r of longest) {
    if (cleaned.includes(r)) return r;
  }

  // 3. 既知サブリージョン → 親リージョンへの別名
  const aliases: Record<string, string> = {
    "ヴォクリューズ": "ローヌ",
    "ガール": "ローヌ",
    "ドローム": "ローヌ",
    "アルデーシュ": "ローヌ",
    "コート・デュ・ローヌ": "ローヌ",
    "コート・デュ・ローヌ・ヴィラージュ": "ローヌ",
    "シャトーヌフ・デュ・パプ": "ローヌ",
    "ジゴンダス": "ローヌ",
    "ヴァケラス": "ローヌ",
    "ボージョレ": "ボジョレー",
    "ボージョレー": "ボジョレー",
    "サン＝テミリオン": "ボルドー",
    "サンテミリオン": "ボルドー",
    "メドック": "ボルドー",
    "ポムロル": "ボルドー",
    "コート・ド・ニュイ": "ブルゴーニュ",
    "コート・ド・ボーヌ": "ブルゴーニュ",
    "マコネ": "ブルゴーニュ",
  };
  for (const [alias, target] of Object.entries(aliases)) {
    if (cleaned.includes(alias) && candidates.includes(target)) return target;
  }

  // 4. 候補に無い場合は AI 抽出の生文字列を保持（input が free-text を許容するため）
  return cleaned;
}

function toProductSeed(extracted: WineExtractionResult): Partial<Product> {
  // product_category 優先。後方互換: 古いプロンプトでカテゴリが無い場合はワインの subtype 有無で推測
  const productCategory =
    extracted.product_category ?? (extracted.category ? "ワイン" : null);

  const isWine = productCategory === "ワイン";
  const isJapanese = productCategory === "日本酒" || productCategory === "焼酎";

  const country = normalizeCountry(extracted.country);

  // region フィールドの埋め方:
  //   ワイン: 海外産地名を WINE_REGIONS に正規化
  //   日本酒・焼酎: 都道府県（prefecture）を使う
  //   ジン・ウイスキー: 国名 or null
  const region = isWine
    ? normalizeRegion(country, extracted.region)
    : isJapanese
      ? extracted.prefecture
      : null;

  return {
    name: extracted.wine_name_ja ?? extracted.wine_name_original ?? "",
    producer: extracted.producer,
    region,
    country,
    grape_variety:
      extracted.grape_varieties.length > 0
        ? extracted.grape_varieties.join("、")
        : null,
    vintage: parseVintage(extracted.vintage),
    category: productCategory,
    // ワイン: 赤/白/etc. → mapWineType で形式チェック
    // 非ワイン: AI が出した type 文字列をそのまま採用（純米・麦 など）
    type: isWine ? mapWineType(extracted.category) : (extracted.type ?? null),
    comment: fallbackComment(extracted),
  };
}

/**
 * 抽出結果から polished な酒屋コメントを生成。失敗時は seed の fallback を残す。
 */
async function fetchPolishedComment(seed: Partial<Product>): Promise<string | null> {
  if (!seed.name) return null;
  try {
    const res = await fetch("/api/ai/generate-comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: seed.name,
        category: seed.category,
        type: seed.type,
        producer: seed.producer,
        country: seed.country,
        region: seed.region,
        grapeVariety: seed.grape_variety,
        vintage: seed.vintage,
      }),
    });
    const json = (await res.json()) as
      | { success: true; comment: string }
      | { success: false; error: string };
    return json.success ? json.comment : null;
  } catch {
    return null;
  }
}

export function NewProductPanel({ action }: Props) {
  const [seed, setSeed] = useState<Partial<Product> | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  // useEffect 経由で AILabelExtractor から file 配列を貰うため stable な参照にする
  const handleFilesChange = useCallback((next: File[]) => {
    setFiles(next);
  }, []);

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
        onExtracted={async (data) => {
          const initialSeed = toProductSeed(data);
          // 抽出フィールドを使って polished コメントを生成。失敗しても fallback (tasting_note) が残る
          const polished = await fetchPolishedComment(initialSeed);
          setSeed(polished ? { ...initialSeed, comment: polished } : initialSeed);
        }}
        onFilesChange={handleFilesChange}
      />
      <div className="bg-white rounded-xl border border-rule p-6">
        <ProductForm
          key={formKey}
          product={seed ? (seed as Product) : undefined}
          action={action}
          images={files}
          onImagesChange={setFiles}
        />
      </div>
    </>
  );
}
