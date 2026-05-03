// components/chat/MessageBubble.tsx
// チャットメッセージの吹き出し（自分/相手で左右と色を切り替え）

type Props = {
  body: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  isMine: boolean;
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
}: Props) {
  const isDeleted = deletedAt !== null;
  return (
    <div
      className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2 px-1`}
    >
      <div className="max-w-[78%]">
        <div
          className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
            isDeleted
              ? "bg-gray-100 text-gray-400 italic"
              : isMine
                ? "bg-[#6B1A35] text-white rounded-br-sm"
                : "bg-white border border-gray-200 text-gray-900 rounded-bl-sm"
          }`}
        >
          {isDeleted ? "（削除されたメッセージ）" : body}
        </div>
        <div
          className={`text-[10px] text-gray-400 mt-1 px-1 flex gap-2 ${
            isMine ? "justify-end" : "justify-start"
          }`}
        >
          <span>{formatTime(createdAt)}</span>
          {editedAt && !isDeleted && <span>編集済</span>}
        </div>
      </div>
    </div>
  );
}
