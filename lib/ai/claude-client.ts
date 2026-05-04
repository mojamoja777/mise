// lib/ai/claude-client.ts
// Anthropic SDK 直叩きクライアント。
// デモフェーズでは AI Gateway を経由せず、ANTHROPIC_API_KEY を直接利用する。

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { WINE_EXTRACTION_PROMPT } from "./extract-prompt";
import type {
  WineExtractionResult,
  ImageInput,
} from "@/types/wine-extraction";

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY が未設定です（.env.local に追加してください）"
    );
  }
  if (!cachedClient) cachedClient = new Anthropic({ apiKey: key });
  return cachedClient;
}

export async function extractWineFromImages(
  images: ImageInput[]
): Promise<{
  data: WineExtractionResult;
  usage: { input_tokens: number; output_tokens: number };
}> {
  if (images.length === 0 || images.length > 3) {
    throw new Error("画像は 1〜3 枚で指定してください");
  }

  const client = getClient();

  // 画像コンテンツを組み立て
  const imageContents = images.map((img) => ({
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: img.mediaType,
      data: img.base64,
    },
  }));

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          ...imageContents,
          {
            type: "text",
            text: WINE_EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  });

  // テキストブロックから JSON を抽出
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI からテキスト応答が得られませんでした");
  }

  // ```json ``` フェンスがあれば除去
  let jsonText = textBlock.text.trim();
  jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");

  let parsed: WineExtractionResult;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`JSON パースに失敗しました: ${jsonText.slice(0, 200)}`);
  }

  return {
    data: parsed,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}

/**
 * コスト試算（Sonnet 4.6: $3/M input, $15/M output）
 */
export function calculateCostUsd(usage: {
  input_tokens: number;
  output_tokens: number;
}): number {
  const inputCost = (usage.input_tokens / 1_000_000) * 3;
  const outputCost = (usage.output_tokens / 1_000_000) * 15;
  return inputCost + outputCost;
}
