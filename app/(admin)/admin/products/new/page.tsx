// app/(admin)/admin/products/new/page.tsx
// 管理者 - 商品登録ページ

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NewProductPanel } from "@/components/admin/NewProductPanel";
import { createProduct } from "../actions";
import { PlateCorner } from "@/components/ui/PlateCorner";

export default function NewProductPage() {
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

      <header className="border-b border-rule pb-5 mb-7">
        <p className="caps">Plate VI · Cellar / New Entry</p>
        <h1 className="font-serif text-5xl mt-2 tracking-tight">商品登録</h1>
        <p className="font-italic-serif text-base mt-2 text-ink-3">
          ラベル写真からの自動入力 + 手入力で商品を登録します
        </p>
      </header>

      <NewProductPanel action={createProduct} />

      <p className="ornament mt-10" />
    </div>
  );
}
