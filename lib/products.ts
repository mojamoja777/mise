// lib/products.ts
// 商品マスタの読み取りヘルパ（buyer 一覧で使用）
// 'use cache' で Edge にキャッシュし、商品 CRUD 後に revalidateTag('products') で破棄する。

import { cacheLife, cacheTag } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database";

export type ActiveProduct =
  Database["public"]["Tables"]["products"]["Row"];

/**
 * buyer の一覧画面に出す「販売中」商品を取得する。
 *
 * 設計ポイント：
 *  - cookie / 認証ヘッダを参照しない（buyer 全員に同じ結果を返す pure な query）
 *  - そのため service role クライアントで取得し、RLS をバイパスしても情報露出は無い
 *  - 'use cache' でレスポンスを Vercel 側にキャッシュ → 2回目以降は ms オーダー
 *  - 商品 CRUD 完了時に revalidateTag('products') で破棄
 */
export async function getActiveProducts(): Promise<ActiveProduct[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("name");

  return data ?? [];
}

/**
 * buyer の taste_tags と商品をゆるくマッチして「あなたの嗜好に合う」上位 N 件を返す。
 * マッチ対象: name / producer / region / country / category / grape_variety / type
 * スコア: マッチした field 数の合計（複数 tag 重ねて加算）
 *
 * tags が空 or マッチ商品 0 件なら null を返す（呼び出し側で section ごと隠す）。
 */
export function recommendByTags(
  tags: string[],
  products: ActiveProduct[],
  limit = 6
): ActiveProduct[] | null {
  const cleanTags = tags.map((t) => t.trim()).filter((t) => t.length > 0);
  if (cleanTags.length === 0) return null;

  const scored = products
    .map((p) => {
      const haystack = [
        p.name,
        p.producer ?? "",
        p.region ?? "",
        p.country ?? "",
        p.category ?? "",
        p.grape_variety ?? "",
        p.type ?? "",
      ]
        .join(" ")
        .toLowerCase();
      const score = cleanTags.reduce(
        (s, t) => s + (haystack.includes(t.toLowerCase()) ? 1 : 0),
        0
      );
      return { product: p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;
  return scored.slice(0, limit).map((x) => x.product);
}
