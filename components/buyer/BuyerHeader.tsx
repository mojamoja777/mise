"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ShoppingCart, LogOut } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { logout } from "@/app/(auth)/login/actions";
import { createClient } from "@/lib/supabase/client";

type Props = {
  chatUnread?: number;
  buyerId?: string | null;
};

export function BuyerHeader({ chatUnread = 0, buyerId = null }: Props) {
  const { totalItems, hydrated } = useCart();
  const pathname = usePathname();

  // Suspense + async server component の streaming で CartProvider が先にハイドレートし、
  // BuyerHeader 単独のハイドレーション時点では useCart が既に items を持つ → SSR HTML と齟齬。
  // mounted ゲートで初回 client render を SSR と一致させ、useEffect 後に badge を出す。
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // BottomNav と同じ Realtime 増分パターン
  const [realtimeUnread, setRealtimeUnread] = useState(0);
  const isOnChatPage = pathname.startsWith("/buyer/chat");

  useEffect(() => {
    if (isOnChatPage) setRealtimeUnread(0);
  }, [isOnChatPage]);

  useEffect(() => {
    if (!buyerId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`chat-unread-header:${buyerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `buyer_id=eq.${buyerId}`,
        },
        (payload) => {
          const next = payload.new as {
            sender_role: string;
            deleted_at: string | null;
          };
          if (next.sender_role !== "admin") return;
          if (next.deleted_at) return;
          if (!isOnChatPage) {
            setRealtimeUnread((n) => n + 1);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [buyerId, isOnChatPage]);

  const totalChatUnread = isOnChatPage ? 0 : chatUnread + realtimeUnread;

  return (
    <header className="bg-paper border-b border-rule px-6 h-16 flex items-center justify-between shrink-0">
      <Link href="/buyer" className="flex items-baseline gap-3">
        <span className="font-serif text-2xl tracking-tight">Mise</span>
        <span className="caps hidden sm:inline">Maison du Vin</span>
      </Link>
      <div className="flex items-center gap-5">
        <Link href="/buyer" className="text-sm text-ink-2 hover:text-plate hidden sm:inline-block">
          Cellar
        </Link>
        <Link href="/buyer/orders" className="text-sm text-ink-2 hover:text-plate hidden sm:inline-block">
          Orders
        </Link>
        <Link href="/buyer/invoices" className="text-sm text-ink-2 hover:text-plate hidden sm:inline-block">
          Invoices
        </Link>
        <Link
          href="/buyer/chat"
          className="relative text-sm text-ink-2 hover:text-plate hidden sm:inline-block"
        >
          Chat
          {mounted && totalChatUnread > 0 && (
            <span className="absolute -top-1 -right-3 bg-vermilion text-paper text-[10px] font-medium rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-mono">
              {totalChatUnread > 99 ? "99+" : totalChatUnread}
            </span>
          )}
        </Link>
        <span className="hairline w-px h-4 hidden sm:block" />
        <Link href="/buyer/cart" className="relative p-1 text-ink hover:text-plate transition-colors">
          <ShoppingCart className="w-5 h-5" />
          {mounted && hydrated && totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-vermilion text-paper text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center font-mono">
              {totalItems > 99 ? "99+" : totalItems}
            </span>
          )}
        </Link>
        <button
          onClick={() => logout()}
          className="p-1 text-ink-3 hover:text-plate transition-colors"
          title="ログアウト"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
