// app/(admin)/admin/products/[id]/edit/page.tsx
// 管理者 - 商品編集ページ

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/ProductForm";
import type { ExistingImage } from "@/components/admin/ProductImagesGrid";
import { updateProduct } from "../../actions";
import { PlateCorner } from "@/components/ui/PlateCorner";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: images }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase
      .from("product_images")
      .select("id, storage_url, is_main, image_role, created_at")
      .eq("product_id", id)
      .order("is_main", { ascending: false })
      .order("created_at", { ascending: true }),
  ]);

  if (!product) notFound();

  const existingImages: ExistingImage[] = (images ?? []).map((img) => ({
    id: img.id,
    storage_url: img.storage_url,
    is_main: img.is_main,
    image_role: img.image_role,
  }));

  // updateProduct を id に束縛したアクション
  const updateProductWithId = updateProduct.bind(null, id);

  return (
    <div className="px-10 pt-7 pb-10 relative max-w-4xl">
      <PlateCorner number="06" />

      <Link
        href="/admin/products"
        className="flex items-center gap-1 text-sm text-ink-3 hover:text-plate mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        商品一覧へ戻る
      </Link>

      <header className="border-b border-rule pb-5 mb-7 flex items-end justify-between">
        <div>
          <p className="caps">Plate VI · Cellar / Edit</p>
          <h1 className="font-serif text-5xl mt-2 tracking-tight">商品編集</h1>
          <p className="font-italic-serif text-base mt-2 text-ink-3">
            既存の商品情報を編集します
          </p>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            product.status === "published"
              ? "bg-forest-bg text-forest"
              : "bg-paper-2 text-ink-3"
          }`}
        >
          {product.status === "published" ? "公開中" : "下書き"}
        </span>
      </header>

      <div className="card-float p-6">
        <ProductForm
          product={product}
          action={updateProductWithId}
          existingImages={existingImages}
          productId={id}
        />
      </div>

      <p className="ornament mt-10" />
    </div>
  );
}
