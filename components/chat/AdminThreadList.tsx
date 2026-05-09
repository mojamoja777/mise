// components/chat/AdminThreadList.tsx
// admin チャットの左ペイン：buyer 一覧 + 最終メッセージ + 未読バッジ

import Link from "next/link";
import type { AdminChatThread } from "@/lib/chat";

type Props = {
  threads: AdminChatThread[];
  activeBuyerId: string | null;
};

function formatRelative(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const today = new Date();
  const diffMs = today.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  if (sameDay) return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function AdminThreadList({ threads, activeBuyerId }: Props) {
  return (
    <aside className="w-80 shrink-0 bg-paper border-r border-rule flex flex-col">
      <div className="px-5 pt-5 pb-4 border-b border-rule">
        <p className="caps">Correspondence</p>
        <h2 className="font-serif text-2xl mt-1 tracking-tight">往復書簡 <span className="font-italic-serif text-ink-3 text-base ml-1">{threads.length}</span></h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {threads.length === 0 ? (
          <p className="text-xs text-ink-3 text-center py-10">
            飲食店が登録されていません
          </p>
        ) : (
          threads.map((t) => {
            const isActive = activeBuyerId === t.buyer_id;
            const hasUnread = t.unread_count > 0;
            const preview = t.last_deleted_at
              ? "（削除されたメッセージ）"
              : t.last_body
                ? (t.last_sender_role === "admin" ? "あなた: " : "") + t.last_body
                : "メッセージがありません";
            return (
              <Link
                key={t.buyer_id}
                href={`/admin/chat/${t.buyer_id}`}
                className={`block px-4 py-3 border-b border-rule transition-colors ${
                  isActive ? "bg-[#ddd5c2]" : "hover:bg-paper-2"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <p
                    className={`text-sm truncate ${
                      hasUnread ? "font-semibold text-ink" : "text-ink-2"
                    }`}
                  >
                    {t.company_name}
                    {!t.is_active && (
                      <span className="ml-1 text-[10px] text-ink-3">
                        (無効)
                      </span>
                    )}
                  </p>
                  <span className="text-[10px] text-ink-3 shrink-0">
                    {formatRelative(t.last_created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p
                    className={`text-xs truncate flex-1 ${
                      hasUnread ? "text-ink-2 font-medium" : "text-ink-3"
                    }`}
                  >
                    {preview}
                  </p>
                  {hasUnread && (
                    <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-mono rounded-full bg-vermilion text-paper">
                      {t.unread_count > 99 ? "99+" : t.unread_count}
                    </span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </aside>
  );
}
