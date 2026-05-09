// app/api/search/route.ts
// ⌘K コマンドパレットの全文検索 API
// テナント内の products / users(buyer) を横断検索する。RLS により他テナント混入は不可。

import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";

export const maxDuration = 10;

export type SearchResult = {
  products: Array<{
    id: string;
    name: string;
    producer: string | null;
    region: string | null;
    vintage: number | null;
  }>;
  buyers: Array<{
    id: string;
    company_name: string | null;
    customer_code: string | null;
  }>;
};

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length === 0) {
    return NextResponse.json({
      products: [],
      buyers: [],
    } satisfies SearchResult);
  }

  // SQL injection / pattern 制御文字エスケープ
  const pattern = `%${q.replace(/[%_]/g, "\\$&")}%`;

  // 自分のロールを取得（buyer の場合 buyers 検索を skip）
  const { data: me } = await auth.supabase
    .from("users")
    .select("role")
    .eq("id", auth.user.id)
    .single();
  const isAdmin = me?.role === "admin";

  // 商品検索（admin / buyer 共通）
  const productsPromise = auth.supabase
    .from("products")
    .select("id, name, producer, region, vintage")
    .is("deleted_at", null)
    .or(
      `name.ilike.${pattern},producer.ilike.${pattern},region.ilike.${pattern}`
    )
    .limit(8);

  // 飲食店検索（admin のみ）
  const buyersPromise = isAdmin
    ? auth.supabase
        .from("users")
        .select("id, company_name, customer_code")
        .eq("role", "buyer")
        .or(`company_name.ilike.${pattern},customer_code.ilike.${pattern}`)
        .limit(6)
    : Promise.resolve({ data: [] as Array<{
        id: string;
        company_name: string | null;
        customer_code: string | null;
      }> });

  const [productsRes, buyersRes] = await Promise.all([
    productsPromise,
    buyersPromise,
  ]);

  const result: SearchResult = {
    products: (productsRes.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      producer: p.producer,
      region: p.region,
      vintage: p.vintage,
    })),
    buyers: (buyersRes.data ?? []).map((b) => ({
      id: b.id,
      company_name: b.company_name,
      customer_code: b.customer_code,
    })),
  };

  return NextResponse.json(result);
}
