"use client";

// components/chat/MessageBubble.tsx
// チャットメッセージの吹き出し（自分/相手で左右と色を切り替え）
// 自分のメッセージはホバー時に編集／削除ボタンが出る

import { Pencil, Trash2 } from "lucide-react";

type Props = {
  body: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  isMine: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  if (sameDay) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MessageBubble({
  body,
  createdAt,
  editedAt,
  deletedAt,
  isMine,
  onEdit,
  onDelete,
}: Props) {
  const isDeleted = deletedAt !== null;
  const canMutate = isMine && !isDeleted && (onEdit || onDelete);

  return (
    <div
      className={`group flex ${isMine ? "justify-end" : "justify-start"} mb-2 px-1`}
    >
      <div className="max-w-[78%] relative">
        <div
          className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
            isDeleted
              ? "bg-paper-2 text-ink-3 italic"
              : isMine
                ? "bg-[#1c3a5c] text-white rounded-br-sm"
                : "bg-white border border-rule text-ink rounded-bl-sm"
          }`}
        >
          {isDeleted ? "（削除されたメッセージ）" : body}
        </div>
        <div
          className={`text-[10px] text-ink-3 mt-1 px-1 flex gap-2 ${
            isMine ? "justify-end" : "justify-start"
          }`}
        >
          <span>{formatTime(createdAt)}</span>
          {editedAt && !isDeleted && <span>編集済</span>}
        </div>
        {canMutate && (
          <div
            className={`absolute top-0 ${
              isMine ? "-left-16" : "-right-16"
            } opacity-0 group-hover:opacity-100 transition-opacity flex gap-1`}
          >
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="p-1.5 rounded-md bg-white border border-rule text-ink-3 hover:text-[#1c3a5c] hover:border-[#1c3a5c] shadow-sm"
                aria-label="編集"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="p-1.5 rounded-md bg-white border border-rule text-ink-3 hover:text-crimson hover:border-red-300 shadow-sm"
                aria-label="削除"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
