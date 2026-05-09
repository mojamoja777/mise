// app/api/ai/suggest-reply/route.ts
// チャット返信文案 API。

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { suggestChatReplies, type ChatHistory } from "@/lib/ai/chat-reply";
import { fetchThreadMessages } from "@/lib/chat";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      const status = auth.error.includes("ログイン") ? 401 : 403;
      return NextResponse.json({ success: false, error: auth.error }, { status });
    }

    const body = (await req.json().catch(() => null)) as { buyerId?: string } | null;
    const buyerId = body?.buyerId;
    if (!buyerId) {
      return NextResponse.json({ success: false, error: "buyerId が必要です" }, { status: 400 });
    }

    // 同テナントチェック
    const [{ data: me }, { data: buyer }] = await Promise.all([
      auth.supabase.from("users").select("tenant_id").eq("id", auth.user.id).single(),
      auth.supabase.from("users").select("tenant_id, role").eq("id", buyerId).single(),
    ]);
    if (!me?.tenant_id || !buyer || buyer.role !== "buyer" || buyer.tenant_id !== me.tenant_id) {
      return NextResponse.json({ success: false, error: "権限がありません" }, { status: 403 });
    }

    const messages = await fetchThreadMessages(auth.supabase, buyerId);
    const history: ChatHistory = messages
      .filter((m) => !m.deleted_at)
      .slice(-20)
      .map((m) => ({
        role: m.sender_role,
        body: m.body,
        createdAt: m.created_at,
      }));

    // 直近の注文を3件まで
    const { data: orders } = await auth.supabase
      .from("orders")
      .select(
        `
        id,
        ordered_at,
        order_items ( quantity, allocated_quantity, products ( name ) )
      `,
      )
      .eq("buyer_id", buyerId)
      .order("ordered_at", { ascending: false })
      .limit(3);

    const recentOrders = (orders ?? []).map((o) => {
      const items = (o.order_items ?? []) as Array<{
        quantity: number;
        allocated_quantity: number | null;
        products: { name: string } | null;
      }>;
      const summary = items
        .slice(0, 3)
        .map((i) => `${i.products?.name ?? "—"} ×${i.allocated_quantity ?? i.quantity}`)
        .join(" / ");
      return {
        id: o.id.slice(0, 8),
        orderedAt: o.ordered_at,
        itemSummary: summary,
      };
    });

    const result = await suggestChatReplies({ history, recentOrders });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("suggest-reply error:", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "生成に失敗しました" },
      { status: 500 },
    );
  }
}
