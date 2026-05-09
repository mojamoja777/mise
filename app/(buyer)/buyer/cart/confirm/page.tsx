"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { createOrder } from "../../actions";
import { Button } from "@/components/ui/Button";
import { PlateCorner } from "@/components/ui/PlateCorner";

export default function ConfirmPage() {
  const { items, totalPrice, totalItems, clearCart } = useCart();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (items.length === 0) {
      router.replace("/buyer/cart");
    }
  }, [items.length, router]);

  if (items.length === 0) return null;

  const normalItems = items.filter((i) => !i.isAllocation);
  const allocationItems = items.filter((i) => i.isAllocation);
  const normalTotal = normalItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const allocationTotal = allocationItems.reduce((s, i) => s + i.price * i.quantity, 0);

  async function handleOrder() {
    setLoading(true);
    setError(null);
    const result = await createOrder(items, note);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    clearCart();
    const params = new URLSearchParams();
    if (result.normalOrderId) params.set("normal", result.normalOrderId);
    if (result.allocationOrderId) params.set("allocation", result.allocationOrderId);
    router.push(`/buyer/orders/complete?${params.toString()}`);
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto relative">
      <PlateCorner number="03" />

      <header className="mb-6">
        <p className="caps">Plate III · Confirm Order</p>
        <h1 className="font-serif text-4xl mt-2 tracking-tight">発注確認</h1>
      </header>

      {error && (
        <div className="bg-crimson-bg border border-crimson text-crimson text-sm px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* Total + note + actions */}
      <div className="bg-paper border border-plate p-5 mb-7 space-y-5">
        <div>
          <div className="flex justify-between items-baseline">
            <span className="caps">合計 {totalItems}本</span>
            <span className="font-serif text-3xl plate-num text-plate">
              ¥{totalPrice.toLocaleString()}
            </span>
          </div>
          {allocationItems.length > 0 && (
            <p className="caps text-ink-3 mt-1">※ 割り当て注文は希望本数での概算</p>
          )}
        </div>

        <div>
          <label className="caps block mb-2">備考（任意）</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="配送日の希望など、酒屋への連絡事項を入力してください"
            rows={3}
            className="w-full text-sm bg-paper-2 border border-rule-strong px-3 py-2 focus:outline-none focus:border-plate resize-none placeholder:text-ink-3"
          />
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleOrder}
            disabled={loading}
            variant="primary"
            size="lg"
            className="w-full justify-center"
          >
            {loading ? "発注中..." : "発注する ⏎"}
          </Button>
          <Link href="/buyer/cart" className="block">
            <Button variant="default" size="lg" className="w-full justify-center">
              <ChevronLeft className="w-4 h-4" />
              カートに戻る
            </Button>
          </Link>
        </div>
      </div>

      {normalItems.length > 0 && (
        <section className="bg-paper border border-rule p-4 mb-4">
          <h2 className="font-serif text-lg tracking-tight mb-3">通常注文</h2>
          <ul className="space-y-2">
            {normalItems.map((item) => (
              <li key={item.productId} className="flex justify-between text-sm">
                <span className="text-ink-2 flex-1 truncate pr-2">{item.name}</span>
                <span className="caps text-ink-3 shrink-0">× {item.quantity}本</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-rule mt-3 pt-3 flex justify-between">
            <span className="caps">小計</span>
            <span className="font-serif text-lg plate-num text-plate">
              ¥{normalTotal.toLocaleString()}
            </span>
          </div>
        </section>
      )}

      {allocationItems.length > 0 && (
        <section className="bg-paper border border-amber p-4 mb-4">
          <h2 className="font-serif text-lg tracking-tight text-amber mb-3">割り当て注文</h2>
          <div className="bg-amber-bg border border-amber p-3 mb-3">
            <p className="text-xs text-ink-2 leading-relaxed">
              ⚠ 割り当て対象商品はご希望本数です。受付期限後にお店から実際の割り当て本数をご連絡します。
              <span className="font-medium text-ink">キャンセル不可</span>のため、ご不明点はお問い合わせください。
            </p>
          </div>
          <ul className="space-y-2">
            {allocationItems.map((item) => (
              <li key={item.productId} className="flex justify-between text-sm">
                <span className="text-ink-2 flex-1 truncate pr-2">{item.name}</span>
                <span className="caps text-ink-3 shrink-0">希望 × {item.quantity}本</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-rule mt-3 pt-3 flex justify-between">
            <span className="caps">希望本数での概算</span>
            <span className="font-serif text-lg plate-num text-amber">
              ¥{allocationTotal.toLocaleString()}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
