// types/buyer-enrichment.ts
// 飲食店プロファイルの AI 抽出結果（users.profile_enriched に jsonb 格納）。
// Phase 1: HP fetch、Phase 2/3: gmaps + Vision を追加予定。

export type EnrichmentSource = "hp" | "gmaps" | "instagram" | "manual";

export interface BuyerProfileEnriched {
  /** 業態（例: "手打ち蕎麦", "フレンチ × 割烹"） */
  cuisine_type: string | null;
  /** 看板料理 (3-5 件) */
  signature_dishes: string[];
  /** 強調されている食材 (3-5 件) */
  main_ingredients: string[];
  /** 季節フォーカス（例: "秋は新蕎麦・松茸"） */
  seasonal_focus: string | null;
  /** ドリンク方針（例: "ナチュラルワインに注力"） */
  drink_focus: string | null;
  /** 価格帯推定（例: "ディナー ¥8,000-12,000"） */
  price_range_estimate: string | null;
  /** 雰囲気・客層 */
  atmosphere: string | null;
  /** 酒販業者向けの提案メモ（200 字以内） */
  notes_for_wine_buyer: string | null;
  /** どのソースから抽出したか */
  source: EnrichmentSource;
  /** 取込時の URL */
  source_url: string | null;
}
