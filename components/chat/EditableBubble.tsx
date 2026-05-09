"use client";

// components/chat/EditableBubble.tsx
// 編集モード中のメッセージ吹き出し（textarea + 保存/キャンセル）

import { useEffect, useRef, useState, useTransition } from "react";

type Props = {
  initialBody: string;
  onSave: (body: string) => Promise<{ error: string | null }>;
  onCancel: () => void;
};

export function EditableBubble({ initialBody, onSave, onCancel }: Props) {
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.setSelectionRange(initialBody.length, initialBody.length);
  }, [initialBody.length]);

  function submit() {
    const trimmed = body.trim();
    if (!trimmed || pending) return;
    if (trimmed === initialBody.trim()) {
      onCancel();
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await onSave(trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      onCancel();
    });
  }

  return (
    <div className="flex justify-end mb-2 px-1">
      <div className="max-w-[78%] w-full">
        <textarea
          ref={ref}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          className="w-full border border-[#1c3a5c] rounded-2xl px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[#1c3a5c] resize-y min-h-[60px] bg-white"
        />
        {error && <p className="text-xs text-crimson mt-1 px-1">{error}</p>}
        <div className="flex justify-end gap-2 mt-1">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs px-3 py-1 rounded-md text-ink-2 hover:bg-paper-2"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !body.trim()}
            className="text-xs px-3 py-1 rounded-md bg-[#1c3a5c] text-white hover:bg-[#0e2238] disabled:opacity-40"
          >
            {pending ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
