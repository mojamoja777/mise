// app/(admin)/admin/products/[id]/edit/page.tsx
// 管理者 - 商品編集ページ

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/ProductForm";
import { updateProduct } from "../../actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (!product) notFound();

  // updateProduct を id に束縛したアクション
  const updateProductWithId = updateProduct.bind(null, id);

  return (
    <div className="p-8 max-w-3xl">
      {/* パンくずナビ */}
      <Link
        href="/admin/products"
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#6B1A35] mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        商品一覧へ戻る
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">商品編集</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <ProductForm
          product={product}
          action={updateProductWithId}
          submitLabel="保存する"
        />
      </div>
    </div>
  );
}
