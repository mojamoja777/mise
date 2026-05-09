// app/api/ai/generate-comment/route.ts
// 商品コメント生成 API。

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { generateComment, type CommentSeed } from "@/lib/ai/comment-generate";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      const status = auth.error.includes("ログイン") ? 401 : 403;
      return NextResponse.json({ success: false, error: auth.error }, { status });
    }

    const body = (await req.json().catch(() => null)) as Partial<CommentSeed> | null;
    if (!body || typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ success: false, error: "商品名は必須です" }, { status: 400 });
    }

    const seed: CommentSeed = {
      category: body.category ?? null,
      type: body.type ?? null,
      name: body.name,
      producer: body.producer ?? null,
      vintage: body.vintage ?? null,
      country: body.country ?? null,
      region: body.region ?? null,
      grapeVariety: body.grapeVariety ?? null,
    };

    const result = await generateComment(seed);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("generate-comment error:", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "生成に失敗しました" },
      { status: 500 },
    );
  }
}
