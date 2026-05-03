"use client";
// components/buyer/BuyerHeader.tsx
// 発注者ヘッダー（カートバッジ + ログアウト付き）

import Link from "next/link";
import { ShoppingCart, LogOut } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { logout } from "@/app/(auth)/login/actions";

export function BuyerHeader() {
  const { totalItems, hydrated } = useCart();

  return (
    <header className="bg-[#3B0A1E] text-white px-4 h-14 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-xl">🍷</span>
        <span className="text-sm font-semibold">ワイン発注</span>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/buyer/cart" className="relative p-1">
          <ShoppingCart className="w-6 h-6" />
          {hydrated && totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#B8860B] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {totalItems > 99 ? "99+" : totalItems}
            </span>
          )}
        </Link>
        <button
          onClick={() => logout()}
          className="p-1 hover:opacity-70 transition-opacity"
          title="ログアウト"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
