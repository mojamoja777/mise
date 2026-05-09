"use client";

// components/buyer/BuyerBottomNav.tsx
// 発注者ボトムナビゲーション（アクティブ状態付き）

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ShoppingCart, ClipboardList, MessageCircle, FileText } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { createClient } from "@/lib/supabase/client";

type Props = {
  /** admin からの未読チャット件数（layout が server-side で算出） */
  chatUnread?: number;
  /** Realtime 購読用の自分の user.id */
  buyerId?: string | null;
};

export function BuyerBottomNav({ chatUnread = 0, buyerId = null }: Props) {
  const pathname = usePathname();
  const { totalItems, hydrated } = useCart();

  // Suspense + async server component の streaming で CartProvider が先にハイドレートし、
  // BottomNav 単独のハイドレーション時点では useCart が既に items を持つ → SSR HTML と齟齬。
  // mounted ゲートで初回 client render を SSR と一致させ、useEffect 後に badge を出す。
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Realtime で受信した admin → 自分への新着メッセージ件数（layout 再描画までの delta）
  const [realtimeUnread, setRealtimeUnread] = useState(0);
  const isOnChatPage = pathname.startsWith("/buyer/chat");

  // チャット画面を開いたら delta はリセット（既読扱い）
  useEffect(() => {
    if (isOnChatPage) setRealtimeUnread(0);
  }, [isOnChatPage]);

  // Realtime 購読：自分宛 (buyer_id=eq.me) で sender_role=admin の新着を increment
  useEffect(() => {
    if (!buyerId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`chat-unread:${buyerId}`)
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

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-rule flex justify-around items-center h-16 px-4">
      <Link
        href="/buyer"
        className={`flex flex-col items-center gap-1 transition-colors ${
          isActive("/buyer") &&
          !isActive("/buyer/cart") &&
          !isActive("/buyer/orders") &&
          !isActive("/buyer/chat") &&
          !isActive("/buyer/invoices")
            ? "text-plate"
            : "text-ink-3"
        }`}
      >
        <span className="text-xl">🍷</span>
        <span className="text-xs">商品</span>
      </Link>

      <Link
        href="/buyer/cart"
        className={`relative flex flex-col items-center gap-1 transition-colors ${
          isActive("/buyer/cart") ? "text-plate" : "text-ink-3"
        }`}
      >
        <div className="relative">
          <ShoppingCart className="w-5 h-5" />
          {mounted && hydrated && totalItems > 0 && (
            <span className="absolute -top-1 -right-2 bg-gold text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {totalItems > 9 ? "9+" : totalItems}
            </span>
          )}
        </div>
        <span className="text-xs">カート</span>
      </Link>

      <Link
        href="/buyer/orders"
        className={`flex flex-col items-center gap-1 transition-colors ${
          isActive("/buyer/orders") ? "text-plate" : "text-ink-3"
        }`}
      >
        <ClipboardList className="w-5 h-5" />
        <span className="text-xs">履歴</span>
      </Link>

      <Link
        href="/buyer/invoices"
        className={`flex flex-col items-center gap-1 transition-colors ${
          isActive("/buyer/invoices") ? "text-plate" : "text-ink-3"
        }`}
      >
        <FileText className="w-5 h-5" />
        <span className="text-xs">請求書</span>
      </Link>

      <Link
        href="/buyer/chat"
        className={`relative flex flex-col items-center gap-1 transition-colors ${
          isActive("/buyer/chat") ? "text-plate" : "text-ink-3"
        }`}
      >
        <div className="relative">
          <MessageCircle className="w-5 h-5" />
          {mounted && totalChatUnread > 0 && (
            <span className="absolute -top-1 -right-2 bg-gold text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {totalChatUnread > 9 ? "9+" : totalChatUnread}
            </span>
          )}
        </div>
        <span className="text-xs">チャット</span>
      </Link>
    </nav>
  );
}
