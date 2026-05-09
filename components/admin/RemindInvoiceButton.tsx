"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { sendInvoiceReminderAction } from "@/app/(admin)/admin/invoices/actions";

export function RemindInvoiceButton({
  invoiceId,
  buyerName,
  daysOverdue,
}: {
  invoiceId: string;
  buyerName: string;
  daysOverdue: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (
      !window.confirm(
        `${buyerName} 様に督促メールを送信しますか？\n（支払期限を ${daysOverdue} 日経過しています）`
      )
    )
      return;
    startTransition(async () => {
      setError(null);
      const result = await sendInvoiceReminderAction(invoiceId);
      if (result.ok) {
        setDone(true);
      } else {
        setError(result.error ?? "送信に失敗しました");
      }
    });
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-forest" title="送信済">
        ✓ 送信済
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-1 text-xs px-2 py-1 border border-crimson text-crimson hover:bg-crimson-bg rounded transition-colors disabled:opacity-50"
        title={`督促メール（${daysOverdue}日経過）`}
      >
        <Mail className="w-3 h-3" />
        {isPending ? "送信中…" : "督促"}
      </button>
      {error && (
        <span className="ml-2 text-[10px] text-crimson" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
