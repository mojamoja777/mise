// components/admin/PrintButton.tsx
// 印刷ボタン（伝票ページ用）

"use client";

import { Printer, ArrowLeft } from "lucide-react";

export function PrintButton() {
  return (
    <>
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-1.5 bg-white border border-rule-strong text-ink-2 px-4 py-2 rounded-lg text-sm hover:bg-paper-2 shadow-sm transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        戻る
      </button>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-1.5 bg-plate text-white px-4 py-2 rounded-lg text-sm hover:bg-plate-deep shadow-sm transition-colors cursor-pointer"
      >
        <Printer className="w-4 h-4" />
        印刷する
      </button>
    </>
  );
}
