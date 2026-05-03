"use client";

// components/chat/ThreadView.tsx
// メッセージ履歴 + 入力欄 + Supabase Realtime 購読
// initial messages はサーバから渡され、以降は INSERT / UPDATE をリアルタイムで取り込む

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";

export type ThreadMessage = {
  id: string;
  body: string;
  sender_id: string;
  sender_role: "admin" | "buyer";
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

type Props = {
  /** 購読対象のスレッド（buyerId）。admin/buyer どちらでも会話相手の buyer.id を指す */
  buyerId: string;
  initialMessages: ThreadMessage[];
  currentUserId: string;
  send: (body: string) => Promise<{ error: string | null }>;
  emptyHint?: string;
};

export function ThreadView({
  buyerId,
  initialMessages,
  currentUserId,
  send,
  emptyHint,
}: Props) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  // SSR で更新された initial を反映（router.refresh 直後など）
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // 履歴更新時に最下部にスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages.length]);

  // Realtime 購読：buyer_id = eq.<buyerId> でフィルタ
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat-thread:${buyerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `buyer_id=eq.${buyerId}`,
        },
        (payload) => {
          const next = payload.new as ThreadMessage;
          setMessages((prev) =>
            prev.some((m) => m.id === next.id) ? prev : [...prev, next]
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `buyer_id=eq.${buyerId}`,
        },
        (payload) => {
          const next = payload.new as ThreadMessage;
          setMessages((prev) =>
            prev.map((m) => (m.id === next.id ? next : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [buyerId]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
            <span className="text-3xl mb-2" aria-hidden>💬</span>
            <p>{emptyHint ?? "まだメッセージはありません"}</p>
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              body={m.body}
              createdAt={m.created_at}
              editedAt={m.edited_at}
              deletedAt={m.deleted_at}
              isMine={m.sender_id === currentUserId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <MessageComposer send={send} />
    </div>
  );
}
