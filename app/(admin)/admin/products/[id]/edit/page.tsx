// app/(admin)/admin/products/[id]/edit/page.tsx
// 管理者 - 商品編集ページ

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/ProductForm";
import type { ExistingImage } from "@/components/admin/ProductImagesGrid";
import { updateProduct } from "../../actions";

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
    <div className="p-8 max-w-3xl">
      {/* パンくずナビ */}
      <Link
        href="/admin/products"
        className="flex items-center gap-1 text-sm text-ink-3 hover:text-[#1c3a5c] mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        商品一覧へ戻る
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-ink">商品編集</h1>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            product.status === "published"
              ? "bg-green-100 text-green-700"
              : "bg-paper-2 text-ink-3"
          }`}
        >
          {product.status === "published" ? "公開中" : "下書き"}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-rule p-6">
        <ProductForm
          product={product}
          action={updateProductWithId}
          existingImages={existingImages}
          productId={id}
        />
      </div>
    </div>
  );
}
