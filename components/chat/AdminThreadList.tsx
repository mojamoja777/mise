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
    <aside className="w-72 shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">飲食店</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {threads.length} 件
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {threads.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-10">
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
                className={`block px-4 py-3 border-b border-gray-100 transition-colors ${
                  isActive ? "bg-[#FDF4F6]" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <p
                    className={`text-sm truncate ${
                      hasUnread ? "font-semibold text-gray-900" : "text-gray-700"
                    }`}
                  >
                    {t.company_name}
                    {!t.is_active && (
                      <span className="ml-1 text-[10px] text-gray-400">
                        (無効)
                      </span>
                    )}
                  </p>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {formatRelative(t.last_created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p
                    className={`text-xs truncate flex-1 ${
                      hasUnread ? "text-gray-700 font-medium" : "text-gray-400"
                    }`}
                  >
                    {preview}
                  </p>
                  {hasUnread && (
                    <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-[#B8860B] text-white">
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
