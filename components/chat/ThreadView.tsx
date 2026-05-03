"use client";

// components/chat/ThreadView.tsx
// メッセージ履歴 + 入力欄をまとめたスレッドビュー
// 履歴はサーバから渡された props を表示するだけ（Realtime は Phase 3-B で追加）

import { useEffect, useRef } from "react";
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
  messages: ThreadMessage[];
  currentUserId: string;
  send: (body: string) => Promise<{ error: string | null }>;
  emptyHint?: string;
};

export function ThreadView({ messages, currentUserId, send, emptyHint }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 履歴更新時に最下部にスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages.length]);

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
