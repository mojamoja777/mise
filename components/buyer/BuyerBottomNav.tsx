"use client";

// components/buyer/BuyerBottomNav.tsx
// 発注者ボトムナビゲーション（アクティブ状態付き）

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, ClipboardList } from "lucide-react";
import { useCart } from "@/lib/cart-context";

export function BuyerBottomNav() {
  const pathname = usePathname();
  const { totalItems, hydrated } = useCart();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 px-4">
      <Link
        href="/buyer"
        className={`flex flex-col items-center gap-1 transition-colors ${
          isActive("/buyer") && !isActive("/buyer/cart") && !isActive("/buyer/orders")
            ? "text-[#6B1A35]"
            : "text-gray-400"
        }`}
      >
        <span className="text-xl">🍷</span>
        <span className="text-xs">商品</span>
      </Link>

      <Link
        href="/buyer/cart"
        className={`relative flex flex-col items-center gap-1 transition-colors ${
          isActive("/buyer/cart") ? "text-[#6B1A35]" : "text-gray-400"
        }`}
      >
        <div className="relative">
          <ShoppingCart className="w-5 h-5" />
          {hydrated && totalItems > 0 && (
            <span className="absolute -top-1 -right-2 bg-[#B8860B] text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {totalItems > 9 ? "9+" : totalItems}
            </span>
          )}
        </div>
        <span className="text-xs">カート</span>
      </Link>

      <Link
        href="/buyer/orders"
        className={`flex flex-col items-center gap-1 transition-colors ${
          isActive("/buyer/orders") ? "text-[#6B1A35]" : "text-gray-400"
        }`}
      >
        <ClipboardList className="w-5 h-5" />
        <span className="text-xs">履歴</span>
      </Link>
    </nav>
  );
}
