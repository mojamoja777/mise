// app/(buyer)/layout.tsx
// 発注者ページ共通レイアウト（CartProvider でラップ）

import { Suspense } from "react";
import { CartProvider } from "@/lib/cart-context";
import { BuyerHeader } from "@/components/buyer/BuyerHeader";
import { BuyerBottomNav } from "@/components/buyer/BuyerBottomNav";

export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen bg-gray-50">
        {/* useCart など dynamic input を含むため Suspense が必要 */}
        <Suspense fallback={<header className="bg-[#3B0A1E] h-14 shrink-0" />}>
          <BuyerHeader />
        </Suspense>
        <main className="flex-1 pb-16 overflow-auto">{children}</main>
        <Suspense fallback={<nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200" />}>
          <BuyerBottomNav />
        </Suspense>
      </div>
    </CartProvider>
  );
}
