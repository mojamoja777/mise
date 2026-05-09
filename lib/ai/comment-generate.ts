// lib/ai/comment-generate.ts
// 商品コメント（テイスティングノート／料理との相性）の生成。

import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY が未設定です");
  if (!cachedClient) cachedClient = new Anthropic({ apiKey: key });
  return cachedClient;
}

export type CommentSeed = {
  category: string | null;
  type: string | null;
  name: string;
  producer: string | null;
  vintage: number | null;
  country: string | null;
  region: string | null;
  grapeVariety: string | null;
};

const SYSTEM_PROMPT = `あなたは日本の酒販店 Mise の店主です。
飲食店向けに、自店で扱う商品の短いコメントを書きます。

ルール：
- 全体で 80〜140 字
- セリフ調・語尾は「。」で締める
- テイスティングのキーワードを2〜3、料理との相性の提案を1つ
- 不確かな情報は出さず、品種・産地・ヴィンテージから一般化して書く
- 「美味しい」「素晴らしい」のような陳腐な評価語は避ける
- 価格や在庫、希少性には言及しない

出力はコメント文字列のみ。前後の説明や記号は不要。`;

export async function generateComment(seed: CommentSeed): Promise<{
  comment: string;
  usage: { input_tokens: number; output_tokens: number };
}> {
  const client = getClient();
  const userPrompt = JSON.stringify(seed, null, 2);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI からテキスト応答が得られませんでした");
  }
  const comment = textBlock.text.trim().replace(/^["「]|["」]$/g, "");

  return {
    comment,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}
