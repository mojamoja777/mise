"use client";

// components/chat/MessageComposer.tsx
// テキスト入力 + 送信ボタン。Server Action を呼ぶだけのシンプル UI。

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  send: (body: string) => Promise<{ error: string | null }>;
  placeholder?: string;
};

export function MessageComposer({ send, placeholder = "メッセージを入力" }: Props) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    const trimmed = body.trim();
    if (!trimmed || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await send(trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="border-t border-gray-200 bg-white px-3 py-2">
      {error && (
        <p className="text-xs text-red-600 mb-1 px-1">{error}</p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={placeholder}
          className="flex-1 min-h-[40px] max-h-[160px] resize-y border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B1A35]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending || !body.trim()}
          className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#6B1A35] text-white hover:bg-[#9B2D50] disabled:opacity-40 transition-colors"
          aria-label="送信"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[10px] text-gray-400 mt-1 px-1">
        ⌘/Ctrl + Enter で送信
      </p>
    </div>
  );
}
