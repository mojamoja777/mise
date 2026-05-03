"use server";

// lib/ai/extract-product.ts
// 商品ラベル写真から Claude Sonnet で商品情報を抽出する Server Action。
// 画像は base64 で受け取り、構造化出力で返す。

import { generateText, Output } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { CATEGORIES, WINE_TYPES, WINE_COUNTRIES } from "@/lib/product-constants";

// 抽出結果のスキーマ
const ExtractedProductSchema = z.object({
  name: z
    .string()
    .nullable()
    .describe("商品名（ラベルに記載されているそのままの正式名称）"),
  producer: z.string().nullable().describe("生産者・蔵元・ドメーヌ名"),
  vintage: z
    .number()
    .int()
    .nullable()
    .describe("ヴィンテージ年（西暦4桁、無ければ null）"),
  category: z
    .enum(["ワイン", "日本酒", "焼酎", "ジン", "ウイスキー", "その他"])
    .nullable()
    .describe("商品カテゴリ"),
  type: z
    .enum(["赤", "白", "ロゼ", "スパークリング", "オレンジ"])
    .nullable()
    .describe("ワインの場合のタイプ。それ以外は null"),
  country: z
    .string()
    .nullable()
    .describe("ワインの場合の生産国（フランス／イタリア等）"),
  region: z
    .string()
    .nullable()
    .describe("産地・地域（ブルゴーニュ／能登／鹿児島県 等）"),
  grape_variety: z
    .string()
    .nullable()
    .describe("ワインの場合の品種（ピノ・ノワール／シャルドネ等）。複数なら、で連結"),
  comment: z
    .string()
    .nullable()
    .describe(
      "ラベルから読み取れる特筆事項や、Claude の知識に基づく簡単な解説（1〜2文）。確信が持てない情報は載せない。"
    ),
});

export type ExtractedProduct = z.infer<typeof ExtractedProductSchema>;

const SYSTEM_PROMPT = `あなたは熟練のソムリエ／酒販店スタッフです。
入力されたボトルラベルの写真から、商品マスタ登録用の情報を抽出してください。

判断ルール:
- ラベルに明記されている情報を最優先する
- 確信が持てない場合は null を返す（推測しない）
- カテゴリは ${CATEGORIES.join(" / ")} のいずれか
- ワインの場合のタイプは ${WINE_TYPES.join(" / ")} のいずれか
- ワインの場合の国は ${WINE_COUNTRIES.join(" / ")} の表記に合わせる
- vintage は西暦4桁の整数。NV・ノンヴィンテージなら null
- 文字が読み取れない箇所は null
- comment は読み取れた情報の補足のみ（憶測は禁止）`;

export async function extractProductFromImage(
  imageBase64: string,
  mimeType: string
): Promise<{ product: ExtractedProduct | null; error: string | null }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { product: null, error: auth.error };

  // データ URL prefix が混入していたら剥がす
  const cleaned = imageBase64.replace(/^data:[^;]+;base64,/, "");
  if (!cleaned) return { product: null, error: "画像データが空です" };

  // 認証は Vercel OIDC（本番）または AI_GATEWAY_API_KEY（ローカル開発）
  // どちらも未設定なら gateway 呼び出しが投げる例外を catch する

  try {
    const result = await generateText({
      model: gateway("anthropic/claude-sonnet-4.6"),
      output: Output.object({ schema: ExtractedProductSchema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "このボトル／ラベルの写真から商品情報を抽出してください。",
            },
            {
              type: "image",
              image: cleaned,
              mediaType: mimeType,
            },
          ],
        },
      ],
      system: SYSTEM_PROMPT,
      maxRetries: 1,
    });

    return { product: result.output, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    console.error("[extractProductFromImage]", message);
    return { product: null, error: `抽出に失敗しました: ${message}` };
  }
}
