// lib/ai/chat-reply.ts
// チャット返信文案の生成。直近の会話と注文文脈を見て3案返す。

import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY が未設定です");
  if (!cachedClient) cachedClient = new Anthropic({ apiKey: key });
  return cachedClient;
}

export type ChatHistory = Array<{
  role: "admin" | "buyer";
  body: string;
  createdAt: string;
}>;

const SYSTEM_PROMPT = `あなたは日本の酒販店 Mise の店主です。
飲食店との 1on1 チャットで、店主としての返信文案を3つ提案します。

ルール：
- それぞれ 30〜80 字程度
- 丁寧体・敬語、礼節を保つが堅すぎない
- 直前の問い合わせに具体的に答える（曖昧な「ご検討ください」連発を避ける）
- 1案目：もっとも素直で実務的な返答
- 2案目：選択肢／確認質問を入れる返答
- 3案目：店として一歩踏み込んだ提案を入れる返答

出力は次の JSON のみ：
{
  "drafts": [
    { "label": "短いラベル（10字以内）", "body": "返信文案" }
  ]
}
前後に説明や \`\`\` は不要。`;

export async function suggestChatReplies({
  history,
  recentOrders,
}: {
  history: ChatHistory;
  recentOrders?: Array<{ id: string; orderedAt: string; itemSummary: string }>;
}): Promise<{
  drafts: Array<{ label: string; body: string }>;
  usage: { input_tokens: number; output_tokens: number };
}> {
  if (history.length === 0) {
    return { drafts: [], usage: { input_tokens: 0, output_tokens: 0 } };
  }
  const client = getClient();
  const userPrompt = JSON.stringify(
    {
      history: history.slice(-12),
      recentOrders: recentOrders?.slice(-3) ?? [],
    },
    null,
    2,
  );

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI からテキスト応答が得られませんでした");
  }
  let jsonText = textBlock.text.trim();
  jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  let parsed: { drafts: Array<{ label: string; body: string }> };
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`JSON パースに失敗しました: ${jsonText.slice(0, 200)}`);
  }

  const drafts = (parsed.drafts ?? [])
    .filter((d) => typeof d?.body === "string")
    .slice(0, 3)
    .map((d) => ({
      label: (d.label ?? "提案").slice(0, 14),
      body: d.body,
    }));

  return {
    drafts,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}
