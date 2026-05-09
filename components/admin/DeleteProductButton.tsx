"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Trash2, X, AlertTriangle } from "lucide-react";
import {
  deleteProduct,
  getProductDeleteImpact,
} from "@/app/(admin)/admin/products/actions";
import type { DeleteImpact } from "@/types/product-delete";

type Props = {
  id: string;
  /** モーダル見出しに表示する商品名（省略時は ID 略称） */
  productName?: string;
};

export function DeleteProductButton({ id, productName }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [impact, setImpact] = useState<DeleteImpact | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await getProductDeleteImpact(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (result.impact.pendingOrders.length === 0) {
        // 確定前注文なし → 通常確認のみ
        const ok = window.confirm(
          "この商品を削除しますか？\n商品台帳・買い手カタログから非表示にし、過去の注文・請求書では引き続き表示されます。\n（アーカイブから復元可能）"
        );
        if (ok) doDelete();
        return;
      }

      // 確定前注文あり → モーダルで詳細表示
      setImpact(result.impact);
    });
  }

  function doDelete() {
    startTransition(async () => {
      const result = await deleteProduct(id);
      if (!result.ok) {
        setError(result.error);
        setImpact(null);
        return;
      }
      window.alert(
        "アーカイブしました。\n商品台帳・買い手カタログから非表示になり、必要なら『アーカイブ』タブから復元できます。"
      );
      window.location.reload();
    });
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="p-2 text-ink-3 hover:text-crimson hover:bg-crimson-bg rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="削除"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      {error && (
        <span className="ml-2 text-xs text-crimson" role="alert">
          {error}
        </span>
      )}

      {impact && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-impact-title"
        >
          <div className="w-full max-w-2xl rounded-xl border border-rule bg-paper shadow-xl">
            <div className="flex items-center justify-between border-b border-rule px-6 py-4">
              <h2
                id="delete-impact-title"
                className="font-serif text-xl tracking-tight"
              >
                削除前確認{productName ? `: ${productName}` : ""}
              </h2>
              <button
                type="button"
                onClick={() => setImpact(null)}
                disabled={isPending}
                className="p-1 text-ink-3 hover:text-ink rounded transition-colors disabled:opacity-40"
                aria-label="閉じる"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber bg-amber-bg/40 p-4 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                <div>
                  <p className="font-medium text-ink">
                    この商品には<span className="plate-num mx-1">
                      {impact.pendingOrders.length}
                    </span>件の確定前の注文・割当リクエストがあります
                  </p>
                  <p className="mt-1 text-xs text-ink-3">
                    削除（非表示化）する前に、下記の店舗に直接連絡することを推奨します。
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-rule">
                <table className="w-full text-sm">
                  <thead className="bg-paper-2 text-left">
                    <tr className="caps text-ink-3">
                      <th className="px-3 py-2 font-medium">店舗</th>
                      <th className="px-3 py-2 font-medium">状態</th>
                      <th className="px-3 py-2 font-medium text-right">本数</th>
                      <th className="px-3 py-2 font-medium">注文日</th>
                      <th className="px-3 py-2 font-medium text-right">連絡</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impact.pendingOrders.map((o) => (
                      <tr key={o.orderId} className="border-t border-rule">
                        <td className="px-3 py-2 text-ink">
                          {o.buyerCompanyName ?? "(未設定)"}
                        </td>
                        <td className="px-3 py-2 text-ink-2">
                          {o.orderStatus === "pending"
                            ? "受付中"
                            : "割当待ち"}
                        </td>
                        <td className="px-3 py-2 plate-num text-right">
                          {o.quantity}
                        </td>
                        <td className="px-3 py-2 text-ink-2">
                          {new Date(o.orderedAt).toLocaleDateString("ja-JP", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Link
                            href={`/admin/chat/${o.buyerId}`}
                            target="_blank"
                            rel="noopener"
                            className="text-plate underline hover:no-underline"
                          >
                            チャット
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-rule px-6 py-4">
              <button
                type="button"
                onClick={() => setImpact(null)}
                disabled={isPending}
                className="px-4 py-2 text-sm border border-rule rounded-lg text-ink-2 hover:bg-paper-2 transition-colors disabled:opacity-40"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={doDelete}
                disabled={isPending}
                className="px-4 py-2 text-sm bg-crimson text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {isPending ? "処理中…" : "それでも削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
