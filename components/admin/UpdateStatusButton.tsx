"use client";
import { useState } from "react";
import { advanceOrderStatus } from "@/app/(admin)/admin/orders/actions";

type Props = {
  orderId: string;
  currentStatus: string;
};

export function UpdateStatusButton({ orderId, currentStatus }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (currentStatus !== "pending") return null;

  async function handleClick() {
    if (!window.confirm("この発注を承認しますか？")) return;
    setLoading(true);
    setError(null);
    const result = await advanceOrderStatus(orderId, currentStatus);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <p className="text-crimson text-sm mb-2">{error}</p>}
      <button
        onClick={handleClick}
        disabled={loading}
        className="px-5 py-2.5 bg-[#1c3a5c] text-white text-sm font-medium rounded-xl hover:bg-[#0e2238] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "処理中..." : "受注承認"}
      </button>
    </div>
  );
}
