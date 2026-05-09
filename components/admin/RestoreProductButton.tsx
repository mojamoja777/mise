"use client";
import { useState, useTransition } from "react";
import { Undo2 } from "lucide-react";
import { restoreProduct } from "@/app/(admin)/admin/products/actions";

export function RestoreProductButton({
  id,
  productName,
}: {
  id: string;
  productName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (
      !window.confirm(
        `「${productName}」を復元しますか？\n商品台帳・買い手カタログに再表示されます。`
      )
    )
      return;

    startTransition(async () => {
      setError(null);
      const result = await restoreProduct(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-forest border border-forest hover:bg-forest-bg rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="復元"
      >
        <Undo2 className="w-3.5 h-3.5" />
        {isPending ? "処理中…" : "復元"}
      </button>
      {error && (
        <span className="ml-2 text-xs text-crimson" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
