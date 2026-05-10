// lib/ai/buyer-enrich.ts
// 飲食店の公式 HP を fetch して AI で店舗プロファイル JSON を抽出する（Phase 1）。

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { BuyerProfileEnriched } from "@/types/buyer-enrichment";

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY が未設定です");
  if (!cachedClient) cachedClient = new Anthropic({ apiKey: key });
  return cachedClient;
}

const SYSTEM_PROMPT = `あなたは日本の酒販業者向けに、飲食店の公開情報から店舗プロファイルを抽出する専門アシスタントです。
飲食店の公式 HP のテキストを与えられるので、酒販業者が仕入提案を考えるときに役立つ JSON を出力してください。

ルール:
- ページに無い情報は null か空配列にする（推測しない）
- 「ナチュラルワインに注力」のような特徴は drink_focus に明記する
- 推測した部分は notes_for_wine_buyer に「【推測】」と明記して書く
- 出力は次の JSON のみ。前後の説明・\`\`\` フェンスは不要。

{
  "cuisine_type": "業態（例: 手打ち蕎麦 / フレンチ × 割烹 / 居酒屋）、不明ならnull",
  "signature_dishes": ["看板料理を 3-5 個。不明なら空配列"],
  "main_ingredients": ["強調されている食材 3-5 個。不明なら空配列"],
  "seasonal_focus": "季節への力の入れ方（例: 秋は新蕎麦・松茸）、不明ならnull",
  "drink_focus": "ドリンク方針（例: ナチュラルワインに注力 / 日本酒中心）、不明ならnull",
  "price_range_estimate": "価格帯推定（例: ディナー ¥8,000-12,000）、不明ならnull",
  "atmosphere": "雰囲気・客層（例: カウンター中心の落ち着いた大人の店）、不明ならnull",
  "notes_for_wine_buyer": "酒販業者がこの店に提案するなら何を考慮すべきか、200字以内"
}`;

/**
 * URL を fetch してテキスト化し、AI で店舗プロファイルを JSON 抽出する。
 *
 * - HTTP fetch でタイムアウト 10s
 * - HTML から script/style を除いてテキスト化
 * - 30,000 文字を上限に切る（多すぎると料金 / コンテキスト圧迫）
 */
export async function enrichFromHp(url: string): Promise<{
  data: BuyerProfileEnriched;
  usage: { input_tokens: number; output_tokens: number };
}> {
  if (!/^https?:\/\//.test(url)) {
    throw new Error("有効な URL を指定してください（http/https）");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  let html: string;
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MiseBot/1.0; +https://wine-saas.vercel.app)",
      },
    });
    if (!res.ok) {
      throw new Error(`URL の取得に失敗しました (${res.status})`);
    }
    html = await res.text();
  } finally {
    clearTimeout(timeoutId);
  }

  const text = stripHtmlToText(html).slice(0, 30_000);
  if (text.trim().length < 50) {
    throw new Error("ページから十分なテキストを抽出できませんでした");
  }

  const client = getClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `URL: ${url}\n\n以下のテキストから店舗プロファイル JSON を抽出してください:\n\n${text}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI からテキスト応答が得られませんでした");
  }

  let jsonText = textBlock.text.trim();
  jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");

  type RawEnrichment = {
    cuisine_type: unknown;
    signature_dishes: unknown;
    main_ingredients: unknown;
    seasonal_focus: unknown;
    drink_focus: unknown;
    price_range_estimate: unknown;
    atmosphere: unknown;
    notes_for_wine_buyer: unknown;
  };

  let parsed: RawEnrichment;
  try {
    parsed = JSON.parse(jsonText) as RawEnrichment;
  } catch {
    throw new Error(
      `JSON パースに失敗しました: ${jsonText.slice(0, 200)}`
    );
  }

  const asString = (v: unknown): string | null =>
    typeof v === "string" && v.length > 0 ? v : null;
  const asArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  const data: BuyerProfileEnriched = {
    cuisine_type: asString(parsed.cuisine_type),
    signature_dishes: asArray(parsed.signature_dishes),
    main_ingredients: asArray(parsed.main_ingredients),
    seasonal_focus: asString(parsed.seasonal_focus),
    drink_focus: asString(parsed.drink_focus),
    price_range_estimate: asString(parsed.price_range_estimate),
    atmosphere: asString(parsed.atmosphere),
    notes_for_wine_buyer: asString(parsed.notes_for_wine_buyer),
    source: "hp",
    source_url: url,
  };

  return {
    data,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}

/**
 * HTML から script / style / SVG を除いてテキスト化（外部ライブラリ不要）。
 */
function stripHtmlToText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
