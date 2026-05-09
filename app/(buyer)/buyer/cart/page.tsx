"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2, Minus, Plus, ShoppingCart, AlertTriangle } from "lucide-react";
import { useCart, type CartItem } from "@/lib/cart-context";
import { syncCartAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { PlateCorner } from "@/components/ui/PlateCorner";

export default function CartPage() {
  const { items, updateQuantity, removeItem, totalPrice, syncItems, hydrated } = useCart();
  const [syncMessages, setSyncMessages] = useState<string[]>([]);

  useEffect(() => {
    // hydrated になってから localStorage の items を見ないと空配列で早期 return してしまう
    if (!hydrated) return;
    let cancelled = false;
    const productIds = items.map((i) => i.productId);
    if (productIds.length === 0) return;

    (async () => {
      const { products, archived } = await syncCartAction(productIds);
      if (cancelled) return;
      const productMap = new Map(products.map((p) => [p.id, p]));
      const archivedIds = new Set(archived.map((a) => a.id));
      const now = Date.now();
      const messages: string[] = [];

      const nextItems = items.flatMap((item) => {
        const product = productMap.get(item.productId);
        if (archivedIds.has(item.productId)) {
          messages.push(
            `${item.name} は商品登録が削除されたためカートから削除しました（チャットでもお知らせしました）`
          );
          return [];
        }
        if (!product || !product.is_active) {
          messages.push(`${item.name} は受付終了のためカートから削除しました`);
          return [];
        }
        if (
          product.is_allocation &&
          product.allocation_deadline &&
          new Date(product.allocation_deadline).getTime() <= now
        ) {
          messages.push(`${item.name} は受付締切を過ぎたためカートから削除しました`);
          return [];
        }
        const stateChanged =
          item.isAllocation !== product.is_allocation ||
          item.allocationDeadline !== (product.allocation_deadline ?? null);
        const priceChanged = item.price !== Number(product.price);

        if (!stateChanged && !priceChanged) return [item];
        if (item.isAllocation && !product.is_allocation) {
          messages.push(`${item.name} は通常販売に戻りました（割り当て対象外）`);
        }
        return [
          {
            ...item,
            isAllocation: product.is_allocation,
            allocationDeadline: product.allocation_deadline ?? null,
            price: Number(product.price),
            name: product.name,
          },
        ];
      });

      syncItems(nextItems);
      setSyncMessages(messages);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 text-ink-3 relative">
        <PlateCorner number="02" />
        <ShoppingCart className="w-10 h-10 mb-4 opacity-40" />
        <p className="font-italic-serif text-base mb-6">カートに何も入っていません</p>
        <Link href="/buyer">
          <Button variant="primary" size="lg">
            セラーへ戻る →
          </Button>
        </Link>
      </div>
    );
  }

  const normalItems = items.filter((item) => !item.isAllocation);
  const allocationItems = items.filter((item) => item.isAllocation);

  const renderItem = (item: CartItem) => {
    const isAlloc = item.isAllocation;
    return (
      <div
        key={item.productId}
        className={`bg-paper border p-4 ${isAlloc ? "border-amber" : "border-rule"}`}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="font-serif text-base leading-tight flex-1 tracking-tight">{item.name}</p>
          <button
            onClick={() => removeItem(item.productId)}
            className="p-1 text-ink-4 hover:text-crimson transition-colors shrink-0"
            aria-label="削除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
              className={`flex items-center justify-center w-8 h-8 border transition-colors ${
                isAlloc ? "border-rule hover:border-amber" : "border-rule hover:border-plate"
              }`}
              aria-label="数量を減らす"
            >
              <Minus className="w-3.5 h-3.5 text-ink-3" />
            </button>
            <span className="w-6 text-center text-base plate-num">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
              className={`flex items-center justify-center w-8 h-8 border transition-colors ${
                isAlloc ? "border-rule hover:border-amber" : "border-rule hover:border-plate"
              }`}
              aria-label="数量を増やす"
            >
              <Plus className="w-3.5 h-3.5 text-ink-3" />
            </button>
          </div>
          <p className={`font-serif text-lg plate-num ${isAlloc ? "text-amber" : "text-plate"}`}>
            ¥{(item.price * item.quantity).toLocaleString()}
          </p>
        </div>

        <p className="text-xs text-ink-3 mt-2 caps">
          ¥{item.price.toLocaleString()} × {item.quantity}
          {isAlloc && <span className="ml-2 text-amber">— 希望本数</span>}
        </p>
      </div>
    );
  };

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto relative">
      <PlateCorner number="02" />

      <header className="mb-6">
        <p className="caps">Plate II · Cart</p>
        <h1 className="font-serif text-4xl mt-2 tracking-tight">
          カート <span className="font-italic-serif text-ink-3 text-2xl ml-1">— {items.length}種</span>
        </h1>
      </header>

      {syncMessages.length > 0 && (
        <div className="bg-amber-bg border border-amber px-4 py-3 mb-4 space-y-1">
          {syncMessages.map((m, i) => (
            <p key={i} className="text-xs text-amber leading-relaxed">
              ⚠ {m}
            </p>
          ))}
        </div>
      )}

      {/* Total + checkout */}
      <div className="bg-paper border border-plate p-5 mb-7">
        <div className="flex justify-between items-baseline mb-3">
          <span className="caps">合計金額</span>
          <span className="font-serif text-3xl plate-num text-plate">
            ¥{totalPrice.toLocaleString()}
          </span>
        </div>
        {allocationItems.length > 0 && (
          <p className="caps text-ink-3 mb-3">※ 割り当て注文は希望本数での概算金額</p>
        )}
        <Link href="/buyer/cart/confirm" className="block">
          <Button variant="primary" size="lg" className="w-full justify-center">
            発注確認へ進む →
          </Button>
        </Link>
      </div>

      {/* Normal section */}
      {normalItems.length > 0 && (
        <section className="mb-10">
          <div className="flex items-baseline gap-2 mb-4 pb-2 border-b border-rule">
            <ShoppingCart className="w-4 h-4 text-plate" />
            <h2 className="font-serif text-lg tracking-tight">通常注文</h2>
            <Tag variant="plate" className="ml-auto">{normalItems.length}種</Tag>
          </div>
          <div className="space-y-3">{normalItems.map(renderItem)}</div>
        </section>
      )}

      {/* Allocation section */}
      {allocationItems.length > 0 && (
        <section className="mb-10">
          <div className="flex items-baseline gap-2 mb-4 pb-2 border-b border-amber">
            <AlertTriangle className="w-4 h-4 text-amber" />
            <h2 className="font-serif text-lg tracking-tight text-amber">割り当て注文</h2>
            <Tag variant="amber" className="ml-auto">{allocationItems.length}種</Tag>
          </div>
          <div className="bg-amber-bg border border-amber p-3 mb-3">
            <p className="text-xs text-ink-2 leading-relaxed">
              <span className="font-medium text-amber">⚠ 希望本数としての受付です。</span>
              受付締切後にお店から実際の割り当て本数をご連絡します。
              <span className="font-medium text-ink">キャンセル不可</span>のため、ご不明点はお問い合わせください。
            </p>
          </div>
          <div className="space-y-3">{allocationItems.map(renderItem)}</div>
        </section>
      )}
    </div>
  );
}
