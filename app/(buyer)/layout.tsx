// app/(buyer)/layout.tsx
// 発注者ページ共通レイアウト（CartProvider でラップ）

import { Suspense } from "react";
import { CartProvider } from "@/lib/cart-context";
import { BuyerHeader } from "@/components/buyer/BuyerHeader";
import { BuyerBottomNav } from "@/components/buyer/BuyerBottomNav";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { requireBuyer } from "@/lib/auth";
import { countBuyerChatUnread } from "@/lib/chat";

async function BuyerBottomNavWithUnread() {
  const auth = await requireBuyer();
  let chatUnread = 0;
  let buyerId: string | null = null;
  if (auth.ok) {
    buyerId = auth.user.id;
    const { data: me } = await auth.supabase
      .from("users")
      .select("last_chat_seen_at")
      .eq("id", auth.user.id)
      .single();
    chatUnread = await countBuyerChatUnread(
      auth.supabase,
      auth.user.id,
      me?.last_chat_seen_at ?? null
    );
  }
  return <BuyerBottomNav chatUnread={chatUnread} buyerId={buyerId} />;
}

async function BuyerHeaderWithUnread() {
  const auth = await requireBuyer();
  let chatUnread = 0;
  let buyerId: string | null = null;
  if (auth.ok) {
    buyerId = auth.user.id;
    const { data: me } = await auth.supabase
      .from("users")
      .select("last_chat_seen_at")
      .eq("id", auth.user.id)
      .single();
    chatUnread = await countBuyerChatUnread(
      auth.supabase,
      auth.user.id,
      me?.last_chat_seen_at ?? null
    );
  }
  return <BuyerHeader chatUnread={chatUnread} buyerId={buyerId} />;
}

export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen bg-paper-2">
        {/* useCart など dynamic input を含むため Suspense が必要 */}
        <Suspense fallback={<header className="bg-[#3B0A1E] h-14 shrink-0" />}>
          <BuyerHeaderWithUnread />
        </Suspense>
        <main className="flex-1 pb-16 overflow-auto">{children}</main>
        <Suspense fallback={<nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-rule" />}>
          <BuyerBottomNavWithUnread />
        </Suspense>
        <CommandPalette role="buyer" />
      </div>
    </CartProvider>
  );
}
