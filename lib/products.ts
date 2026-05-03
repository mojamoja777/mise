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
    .order("name");

  return data ?? [];
}
