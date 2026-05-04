// types/wine-extraction.ts
// AI ラベル読み取り機能の型定義

export interface WineExtractionResult {
  wine_name_ja: string | null;
  wine_name_original: string | null;
  producer: string | null;
  vintage: string | null; // "2022" | "NV" | null
  country: string | null;
  region: string | null;
  appellation: string | null;
  grape_varieties: string[];
  category:
    | "赤"
    | "白"
    | "ロゼ"
    | "スパークリング"
    | "オレンジ"
    | "酒精強化"
    | null;
  type: "辛口" | "中辛口" | "中甘口" | "甘口" | "不明" | null;
  alcohol_percent: number | null;
  volume_ml: number | null;
  certifications: string[];
  filtration: string | null;
  additives: string | null;
  importer: string | null;
  estimated_price_range_jpy: string | null;
  tasting_note: string | null;
  confidence: {
    wine_name: number;
    producer: number;
    vintage: number;
    region: number;
    grape_varieties: number;
  };
  label_text_raw: string;
  notes: string | null;
}

export interface ImageInput {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}

export interface ExtractionResponse {
  success: boolean;
  data?: WineExtractionResult;
  error?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    estimated_cost_usd: number;
  };
}
