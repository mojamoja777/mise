// app/(admin)/admin/products/new/page.tsx
// 管理者 - 商品登録ページ

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NewProductPanel } from "@/components/admin/NewProductPanel";
import { createProduct } from "../actions";

export default function NewProductPage() {
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

      <h1 className="text-2xl font-bold text-gray-900 mb-6">商品登録（新規）</h1>

      <NewProductPanel action={createProduct} />
    </div>
  );
}
