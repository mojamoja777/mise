// app/(admin)/admin/products/[id]/page.tsx
// 管理者 - 商品詳細（read-only）。Low-stock / 検索からの着地点。
// 「編集」ボタンで /[id]/edit へ遷移する 2 段階フロー。

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil, Wine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PlateCorner, Tag, Button } from "@/components/ui";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminProductDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: images }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase
      .from("product_images")
      .select("id, storage_url, is_main")
      .eq("product_id", id)
      .order("is_main", { ascending: false })
      .order("created_at", { ascending: true }),
  ]);

  if (!product) notFound();

  const isArchived = product.deleted_at !== null;
  const mainImage = images?.find((i) => i.is_main) ?? images?.[0] ?? null;

  return (
    <div className="px-10 pt-7 pb-10 relative max-w-5xl">
      <PlateCorner number="06" />

      <Link
        href="/admin/products"
        className="flex items-center gap-1 text-sm text-ink-3 hover:text-plate mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        商品台帳へ戻る
      </Link>

      <header className="border-b border-rule pb-5 mb-7 flex items-end justify-between">
        <div>
          <p className="caps">Plate VI · Cellar / Detail</p>
          <h1 className="font-serif text-5xl mt-2 tracking-tight">
            {product.name}
            {product.vintage && (
              <span className="font-italic-serif text-3xl text-ink-3 ml-3 plate-num">
                {product.vintage}
              </span>
            )}
          </h1>
          {product.producer && (
            <p className="font-italic-serif text-base mt-2 text-ink-3">
              {product.producer}
              {product.region && ` ・ ${product.region}`}
              {product.country && product.region !== product.country && ` ・ ${product.country}`}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {product.status === "published" ? (
              <Tag variant="forest">公開中</Tag>
            ) : (
              <Tag variant="slate">下書き</Tag>
            )}
            {product.is_active ? (
              <Tag variant="amber">販売中</Tag>
            ) : (
              <Tag variant="slate">非表示</Tag>
            )}
            {product.is_allocation && <Tag variant="amber">割当対象</Tag>}
            {isArchived && <Tag variant="crimson">アーカイブ</Tag>}
          </div>
          <Link href={`/admin/products/${id}/edit`}>
            <Button variant="primary" size="sm">
              <Pencil className="w-3.5 h-3.5" />
              編集する
            </Button>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左カラム: 画像 */}
        <div className="lg:col-span-1">
          {mainImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mainImage.storage_url}
              alt={product.name}
              className="w-full aspect-[3/4] object-cover card-float"
            />
          ) : (
            <div className="w-full aspect-[3/4] card-float flex items-center justify-center text-ink-4">
              <Wine className="w-12 h-12" />
            </div>
          )}
          {images && images.length > 1 && (
            <p className="caps mt-2 text-ink-3 text-center">
              他 {images.length - 1} 枚（編集画面で一覧）
            </p>
          )}
        </div>

        {/* 右カラム: 情報 */}
        <div className="lg:col-span-2 space-y-5">
          <section className="card-float p-5">
            <p className="caps mb-3 text-ink-3">基本情報</p>
            <dl className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <Row label="カテゴリ" value={product.category} />
              <Row label="タイプ" value={product.type} />
              <Row label="国" value={product.country} />
              <Row label="地域" value={product.region} />
              <Row label="品種" value={product.grape_variety} />
              <Row
                label="価格（税抜）"
                value={`¥${product.price.toLocaleString()}`}
                highlight
              />
              <Row
                label="在庫"
                value={`${product.stock} 本`}
                highlight={product.stock <= 3}
                accent={product.stock <= 3 ? "amber" : undefined}
              />
              <Row
                label="税区分"
                value={
                  product.tax_class === "standard"
                    ? "標準10%"
                    : product.tax_class === "reduced"
                      ? "軽減8%"
                      : "非課税"
                }
              />
            </dl>
          </section>

          {product.is_allocation && product.allocation_deadline && (
            <section className="card-float p-5 border-amber">
              <p className="caps text-amber mb-2">割当受付</p>
              <p className="font-serif text-2xl plate-num text-amber">
                受付締切{" "}
                {new Date(product.allocation_deadline).toLocaleString("ja-JP", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </section>
          )}

          {product.comment && (
            <section className="card-float p-5">
              <p className="caps mb-3 text-ink-3">コメント（酒屋メモ）</p>
              <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-wrap font-italic-serif">
                {product.comment}
              </p>
            </section>
          )}
        </div>
      </div>

      <p className="ornament mt-10" />
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  accent,
}: {
  label: string;
  value: string | number | null;
  highlight?: boolean;
  accent?: "amber" | "crimson";
}) {
  const colorClass =
    accent === "amber"
      ? "text-amber"
      : accent === "crimson"
        ? "text-crimson"
        : "text-ink";
  return (
    <div className="flex items-baseline gap-2">
      <dt className="caps text-ink-3 w-24 shrink-0">{label}</dt>
      <dd
        className={`flex-1 ${highlight ? "font-serif text-base plate-num" : "text-sm"} ${colorClass}`}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}
