import Link from "next/link";
import { Plus, Archive, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminProductList } from "@/components/admin/AdminProductList";
import { PlateCorner, Button } from "@/components/ui";

type SearchParams = Promise<{ view?: string }>;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const isArchived = params.view === "archived";

  const supabase = await createClient();
  const query = supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: products, error } = isArchived
    ? await query.not("deleted_at", "is", null)
    : await query.is("deleted_at", null);

  // 件数バッジ用に逆ビューもカウント（小さなクエリ）
  const counterQuery = supabase
    .from("products")
    .select("id", { count: "exact", head: true });
  const { count: archivedCount } = isArchived
    ? await counterQuery.is("deleted_at", null)
    : await counterQuery.not("deleted_at", "is", null);

  return (
    <div className="px-10 pt-7 pb-10 relative">
      <PlateCorner number="06" />

      <header className="border-b border-rule pb-5 mb-7 flex items-baseline justify-between">
        <div>
          <p className="caps">Plate VI · Cellar</p>
          <h1 className="font-serif text-5xl mt-2 tracking-tight">
            {isArchived ? "アーカイブ商品" : "商品台帳"}
          </h1>
          <p className="font-italic-serif text-base mt-2 text-ink-3">
            {isArchived
              ? "削除した商品の一覧。復元すれば商品台帳・買い手カタログに再表示されます。"
              : "ワイン / 日本酒 / 焼酎 など、お店に並べる商品の管理"}
          </p>
        </div>
        {!isArchived && (
          <Link href="/admin/products/new">
            <Button variant="primary" size="lg">
              <Plus className="w-4 h-4" />
              新規登録
            </Button>
          </Link>
        )}
      </header>

      {/* ビュー切替 */}
      <nav className="flex items-center gap-2 mb-6 text-sm">
        <Link
          href="/admin/products"
          className={`px-3 py-1.5 rounded-lg border transition-colors ${
            !isArchived
              ? "border-plate text-plate bg-paper"
              : "border-rule text-ink-3 hover:text-ink hover:border-ink-3"
          }`}
        >
          通常
        </Link>
        <Link
          href="/admin/products?view=archived"
          className={`px-3 py-1.5 rounded-lg border transition-colors inline-flex items-center gap-1.5 ${
            isArchived
              ? "border-plate text-plate bg-paper"
              : "border-rule text-ink-3 hover:text-ink hover:border-ink-3"
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          アーカイブ
          {(archivedCount ?? 0) > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-paper-2 text-[10px] plate-num">
              {archivedCount}
            </span>
          )}
        </Link>
        {isArchived && (
          <span className="ml-auto inline-flex items-center text-xs text-ink-3">
            <ChevronRight className="w-3 h-3" />
            復元すれば AI 抽出をやり直さずに済みます
          </span>
        )}
      </nav>

      {error && (
        <div className="bg-crimson-bg border border-crimson text-crimson text-sm px-4 py-3 mb-4">
          商品の取得に失敗しました。
        </div>
      )}

      <AdminProductList
        products={products ?? []}
        mode={isArchived ? "archived" : "active"}
      />

      <p className="ornament mt-10" />
    </div>
  );
}
