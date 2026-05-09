// app/(buyer)/buyer/page.tsx
// 発注者 - 商品一覧ページ + 嗜好タグレコメンド

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getActiveProducts, recommendByTags } from "@/lib/products";
import { ProductList } from "@/components/buyer/ProductList";
import { requireBuyer } from "@/lib/auth";

export default async function BuyerPage() {
  const products = await getActiveProducts();

  // buyer の taste_tags を取得（auth が無い場合はスキップ、recommended は null）
  const auth = await requireBuyer();
  let recommended: typeof products | null = null;
  if (auth.ok) {
    const { data: me } = await auth.supabase
      .from("users")
      .select("taste_tags")
      .eq("id", auth.user.id)
      .single();
    const tags = (me?.taste_tags ?? []) as string[];
    recommended = recommendByTags(tags, products, 6);
  }

  return (
    <>
      {recommended && recommended.length > 0 && (
        <section className="px-4 sm:px-6 pt-6 pb-2">
          <header className="flex items-baseline justify-between border-b border-rule pb-3 mb-4">
            <div>
              <p className="caps text-violet inline-flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                For You
              </p>
              <h2 className="font-serif text-2xl mt-1 tracking-tight">
                あなたの嗜好に合う商品
              </h2>
            </div>
          </header>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recommended.map((p) => (
              <Link
                key={p.id}
                href="#"
                className="card-float p-3 hover:border-violet transition-colors block"
              >
                <p className="font-serif text-sm leading-tight truncate">
                  {p.name}
                  {p.vintage && (
                    <span className="text-ink-3 ml-1 plate-num text-xs">
                      {p.vintage}
                    </span>
                  )}
                </p>
                {(p.producer || p.region) && (
                  <p className="caps mt-1 truncate text-ink-3 text-[10px]">
                    {[p.producer, p.region].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="font-serif plate-num text-base text-plate mt-2">
                  ¥{p.price.toLocaleString()}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ProductList products={products} />
    </>
  );
}
