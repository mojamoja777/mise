// app/(admin)/admin/buyers/new/page.tsx
// 管理者 - 飲食店（buyer）の新規登録

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BuyerForm } from "@/components/admin/BuyerForm";

export default function NewBuyerPage() {
  return (
    <div className="p-8 max-w-3xl">
      <Link
        href="/admin/buyers"
        className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink-2 mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        顧客一覧に戻る
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">顧客の新規登録</h1>
        <p className="text-sm text-ink-3 mt-1">
          登録時に初期パスワードが自動生成されます。
          画面に表示されたパスワードを顧客にお伝えください。
        </p>
      </div>

      <BuyerForm mode="create" />
    </div>
  );
}
