// lib/ai/allocation-suggest.ts
// 割り当て AI 提案。買い手のティア・直近購買・希望本数を踏まえて
// 在庫の按分案を返す。

import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY が未設定です");
  if (!cachedClient) cachedClient = new Anthropic({ apiKey: key });
  return cachedClient;
}

export type AllocationCandidate = {
  requestId: string;
  companyName: string;
  tier: "gold" | "silver" | "bronze";
  amount30d: number;
  ordersTotal: number;
  requestedQuantity: number;
  orderedAt: string;
};

export type AllocationSuggestion = {
  requestId: string;
  allocated: number;
  reason: string;
};

export type AllocationStrategy = "balanced" | "tier" | "fcfs";

const STRATEGY_LABEL: Record<AllocationStrategy, string> = {
  balanced: "比例配分（希望本数の割合に応じて公平に）",
  tier: "VIP優先（gold→silver→bronze の順、希望本数を上限に）",
  fcfs: "先着順（注文日時の早い順から在庫を埋める）",
};

const SYSTEM_PROMPT = `あなたは酒販店 Mise の店主アシスタントです。
希少銘柄の在庫を、複数の飲食店からの希望本数にどう按分するかを助言します。

制約：
- 配分の合計は在庫を超えないこと
- 各買い手への配分は希望本数を超えないこと
- 公平性／関係性／戦略の3軸で判断する

出力は次のスキーマの JSON のみで返してください。前後に説明文や \`\`\` などは不要です。
{
  "suggestions": [
    { "requestId": "string", "allocated": number, "reason": "1行の根拠（30字以内）" }
  ],
  "summary": "全体方針の1行（50字以内）"
}`;

export async function suggestAllocation({
  productName,
  stock,
  candidates,
  strategy,
}: {
  productName: string;
  stock: number;
  candidates: AllocationCandidate[];
  strategy: AllocationStrategy;
}): Promise<{
  suggestions: AllocationSuggestion[];
  summary: string;
  usage: { input_tokens: number; output_tokens: number };
}> {
  if (candidates.length === 0) {
    return {
      suggestions: [],
      summary: "申込がありません",
      usage: { input_tokens: 0, output_tokens: 0 },
    };
  }

  const client = getClient();
  const userPrompt = JSON.stringify(
    {
      product: productName,
      stock,
      strategy: STRATEGY_LABEL[strategy],
      candidates: candidates.map((c) => ({
        requestId: c.requestId,
        company: c.companyName,
        tier: c.tier,
        amount30d: c.amount30d,
        ordersTotal: c.ordersTotal,
        requested: c.requestedQuantity,
        orderedAt: c.orderedAt,
      })),
    },
    null,
    2,
  );

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI からテキスト応答が得られませんでした");
  }
  let jsonText = textBlock.text.trim();
  jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");

  let parsed: { suggestions: AllocationSuggestion[]; summary: string };
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`JSON パースに失敗しました: ${jsonText.slice(0, 200)}`);
  }

  // バリデーション：配分は希望以下、合計は在庫以下に強制クランプ
  const reqMap = new Map(candidates.map((c) => [c.requestId, c]));
  let runningTotal = 0;
  const safeSuggestions: AllocationSuggestion[] = [];
  for (const s of parsed.suggestions ?? []) {
    const c = reqMap.get(s.requestId);
    if (!c) continue;
    const capped = Math.max(0, Math.min(s.allocated | 0, c.requestedQuantity, stock - runningTotal));
    runningTotal += capped;
    safeSuggestions.push({
      requestId: s.requestId,
      allocated: capped,
      reason: (s.reason ?? "").slice(0, 80),
    });
  }

  return {
    suggestions: safeSuggestions,
    summary: parsed.summary ?? "",
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}
