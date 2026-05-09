"use client";
import { useState } from "react";
import { cancelOrder, deleteOrder } from "@/app/(admin)/admin/orders/actions";
import { useRouter } from "next/navigation";

type Props = {
  orderId: string;
  currentStatus: string;
};

export function CancelOrderButton({ orderId, currentStatus }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (currentStatus === "cancelled") return null;

  async function handleCancel() {
    if (!window.confirm("この発注をキャンセルしますか？")) return;
    setLoading(true);
    setError(null);
    const result = await cancelOrder(orderId);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("この発注を完全に削除しますか？この操作は取り消せません。")) return;
    setLoading(true);
    setError(null);
    const result = await deleteOrder(orderId);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/admin");
    }
  }

  return (
    <div className="flex gap-3">
      {error && <p className="text-crimson text-sm">{error}</p>}
      <button
        onClick={handleCancel}
        disabled={loading}
        className="px-5 py-2.5 border border-red-300 text-crimson text-sm font-medium rounded-xl hover:bg-crimson-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "処理中..." : "キャンセル"}
      </button>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="px-5 py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "処理中..." : "削除"}
      </button>
    </div>
  );
}
