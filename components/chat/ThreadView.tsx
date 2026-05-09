"use client";

// components/chat/ThreadView.tsx
// メッセージ履歴 + 入力欄 + Supabase Realtime 購読 + 編集 / 削除
// initial messages はサーバから渡され、以降は INSERT / UPDATE をリアルタイムで取り込む

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { editChatMessage, deleteChatMessage } from "@/lib/chat-mutations";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { EditableBubble } from "./EditableBubble";

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
  /** admin 側のみ true。AI 返信文案ボタンを表示する */
  enableAISuggestions?: boolean;
};

export function ThreadView({
  buyerId,
  initialMessages,
  currentUserId,
  send,
  emptyHint,
  enableAISuggestions,
}: Props) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

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

  function handleEdit(id: string, body: string) {
    return editChatMessage(id, body).then((res) => {
      if (!res.error) router.refresh();
      return res;
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("このメッセージを削除しますか？")) return;
    startTransition(async () => {
      const res = await deleteChatMessage(id);
      if (!res.error) router.refresh();
    });
  }

  return (
    <div className="flex flex-col h-full bg-paper-2">
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-ink-3 text-sm">
            <span className="text-3xl mb-2" aria-hidden>💬</span>
            <p>{emptyHint ?? "まだメッセージはありません"}</p>
          </div>
        ) : (
          messages.map((m) => {
            if (editingId === m.id) {
              return (
                <EditableBubble
                  key={m.id}
                  initialBody={m.body}
                  onSave={(b) => handleEdit(m.id, b)}
                  onCancel={() => setEditingId(null)}
                />
              );
            }
            const isMine = m.sender_id === currentUserId;
            return (
              <MessageBubble
                key={m.id}
                body={m.body}
                createdAt={m.created_at}
                editedAt={m.edited_at}
                deletedAt={m.deleted_at}
                isMine={isMine}
                onEdit={isMine && !m.deleted_at ? () => setEditingId(m.id) : undefined}
                onDelete={isMine && !m.deleted_at ? () => handleDelete(m.id) : undefined}
              />
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <MessageComposer
        send={send}
        suggestionsBuyerId={enableAISuggestions ? buyerId : undefined}
      />
    </div>
  );
}
