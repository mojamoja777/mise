// app/api/ai/extract-label/route.ts
// AI ラベル読み取り API。1〜3 枚の画像を受け取り、Claude Sonnet で構造化抽出する。
// デモフェーズ：認証は既存の requireAdmin、ログはサーバコンソールのみ。

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  extractWineFromImages,
  calculateCostUsd,
} from "@/lib/ai/claude-client";
import type { ImageInput } from "@/types/wine-extraction";

// Fluid Compute 上限の 60 秒に拡張（複数枚 + Vision モデルは 30 秒前後かかることがある）
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // 認証：未認証は 401、非 admin は 403
    const auth = await requireAdmin();
    if (!auth.ok) {
      const status = auth.error.includes("ログイン") ? 401 : 403;
      return NextResponse.json(
        { success: false, error: auth.error },
        { status }
      );
    }

    const body = await req.json();
    const images = body?.images as ImageInput[] | undefined;

    if (
      !images ||
      !Array.isArray(images) ||
      images.length === 0 ||
      images.length > 3
    ) {
      return NextResponse.json(
        { success: false, error: "画像は 1〜3 枚で指定してください" },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const { data, usage } = await extractWineFromImages(images);
    const costUsd = calculateCostUsd(usage);
    const elapsedMs = Date.now() - startTime;

    // デモ用ログ（Anthropic コンソールでも別途確認できる）
    console.log("[AI Extract]", {
      images_count: images.length,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cost_usd: costUsd.toFixed(6),
      elapsed_ms: elapsedMs,
      wine_name: data.wine_name_ja,
      producer: data.producer,
    });

    return NextResponse.json({
      success: true,
      data,
      usage: {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        estimated_cost_usd: costUsd,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "抽出処理でエラーが発生しました";
    console.error("[AI Extract Error]", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
