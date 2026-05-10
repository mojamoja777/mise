"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteBuyerAction } from "@/app/(admin)/admin/buyers/actions";

export function DeleteBuyerButton({
  buyerId,
  buyerName,
}: {
  buyerId: string;
  buyerName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (
      !window.confirm(
        `「${buyerName}」を削除しますか？\n\n` +
          `・顧客台帳・買い手検索から非表示になります\n` +
          `・過去の注文・請求書・チャットは引き続き表示されます\n` +
          `・該当のログインアカウントは無効化されます\n\n` +
          `（必要なら DB から復元可能です）`
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const result = await deleteBuyerAction(buyerId);
      if (!result.ok) {
        setError(result.error ?? "削除に失敗しました");
        return;
      }
      router.push("/admin/buyers");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-crimson text-crimson hover:bg-crimson-bg rounded-lg transition-colors disabled:opacity-40"
      >
        <Trash2 className="w-3.5 h-3.5" />
        {isPending ? "削除中…" : "顧客を削除"}
      </button>
      {error && (
        <span className="ml-2 text-xs text-crimson" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
