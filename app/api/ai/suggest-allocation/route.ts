// app/api/ai/suggest-allocation/route.ts
// 割り当て AI 提案 API。
// product_id を受け取って配分案を返す。

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  suggestAllocation,
  type AllocationCandidate,
  type AllocationStrategy,
} from "@/lib/ai/allocation-suggest";

export const maxDuration = 60;

const VALID_STRATEGIES: AllocationStrategy[] = ["balanced", "tier", "fcfs"];

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      const status = auth.error.includes("ログイン") ? 401 : 403;
      return NextResponse.json({ success: false, error: auth.error }, { status });
    }

    const body = await req.json().catch(() => null);
    const productId = body?.productId as string | undefined;
    const strategy = (body?.strategy as AllocationStrategy | undefined) ?? "balanced";
    if (!productId || !VALID_STRATEGIES.includes(strategy)) {
      return NextResponse.json({ success: false, error: "リクエストが不正です" }, { status: 400 });
    }

    const { data: product } = await auth.supabase
      .from("products")
      .select("id, name, stock")
      .eq("id", productId)
      .is("deleted_at", null)
      .single();

    if (!product) {
      return NextResponse.json({ success: false, error: "商品が見つかりません" }, { status: 404 });
    }
    // テナント分離は RLS に委譲（同テナントの product のみ可視）

    // pending 状態の order_items を取得
    const { data: rows } = await auth.supabase
      .from("order_items")
      .select(
        `
        id,
        quantity,
        orders!inner ( id, ordered_at, status, buyer_id ),
        users:orders ( buyer_id )
      `,
      )
      .eq("product_id", productId)
      .eq("orders.status", "allocation_pending")
      .is("allocated_quantity", null);

    type Row = {
      id: string;
      quantity: number;
      orders: { ordered_at: string; buyer_id: string } | null;
    };
    const items = (rows ?? []) as unknown as Row[];

    // buyer 情報をまとめて取得
    const buyerIds = Array.from(new Set(items.map((i) => i.orders?.buyer_id).filter(Boolean) as string[]));
    const [{ data: buyers }, { data: stats }] = await Promise.all([
      auth.supabase
        .from("users")
        .select("id, company_name, tier")
        .in("id", buyerIds.length > 0 ? buyerIds : ["__none__"]),
      auth.supabase
        .from("buyer_stats")
        .select("buyer_id, amount_30d, orders_total")
        .in("buyer_id", buyerIds.length > 0 ? buyerIds : ["__none__"]),
    ]);

    const buyerMap = new Map((buyers ?? []).map((b) => [b.id, b]));
    const statsMap = new Map((stats ?? []).map((s) => [s.buyer_id, s]));

    const candidates: AllocationCandidate[] = items
      .filter((i) => i.orders)
      .map((i) => {
        const buyer = buyerMap.get(i.orders!.buyer_id);
        const stat = statsMap.get(i.orders!.buyer_id);
        return {
          requestId: i.id,
          companyName: buyer?.company_name ?? "—",
          tier: (buyer?.tier ?? "bronze") as "gold" | "silver" | "bronze",
          amount30d: Number(stat?.amount_30d ?? 0),
          ordersTotal: Number(stat?.orders_total ?? 0),
          requestedQuantity: i.quantity,
          orderedAt: i.orders!.ordered_at,
        };
      });

    const result = await suggestAllocation({
      productName: product.name,
      stock: product.stock,
      candidates,
      strategy,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("suggest-allocation error:", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "AI 提案に失敗しました" },
      { status: 500 },
    );
  }
}
