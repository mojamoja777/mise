// components/admin/GenerateInvoicesButton.tsx
// 管理者が請求書を手動生成するボタン（Cronの補助・テスト用）

"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { generateInvoicesAction } from "@/app/(admin)/admin/invoices/actions";

export function GenerateInvoicesButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = () => {
    if (
      !confirm(
        "前月分の請求書を生成します。\n既存の請求書は上書きされません。実行しますか？"
      )
    ) {
      return;
    }
    startTransition(async () => {
      setMessage(null);
      const result = await generateInvoicesAction();
      if (result.ok) {
        setMessage(
          `生成完了：新規 ${result.created ?? 0} 件、スキップ ${result.skipped ?? 0} 件`
        );
      } else {
        setMessage(`エラー：${result.error ?? "unknown"}`);
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      {message && <span className="text-xs text-ink-2">{message}</span>}
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-1.5 bg-white border border-rule-strong text-ink-2 px-4 py-2 rounded-lg text-sm hover:bg-paper-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${pending ? "animate-spin" : ""}`} />
        {pending ? "生成中..." : "前月分を手動生成"}
      </button>
    </div>
  );
}
