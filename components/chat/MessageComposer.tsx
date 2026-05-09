"use client";

import { useState, useTransition } from "react";
import { Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  send: (body: string) => Promise<{ error: string | null }>;
  placeholder?: string;
  /** 提供されると AI 返信文案ボタンが表示される */
  suggestionsBuyerId?: string;
};

export function MessageComposer({
  send,
  placeholder = "メッセージを入力",
  suggestionsBuyerId,
}: Props) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // AI suggestions
  const [aiPending, setAiPending] = useState(false);
  const [aiDrafts, setAiDrafts] = useState<Array<{ label: string; body: string }>>([]);

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
      setAiDrafts([]);
      router.refresh();
    });
  }

  async function fetchSuggestions() {
    if (!suggestionsBuyerId) return;
    setAiPending(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/suggest-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerId: suggestionsBuyerId }),
      });
      const json = (await res.json()) as
        | { success: true; drafts: Array<{ label: string; body: string }> }
        | { success: false; error: string };
      if (!json.success) {
        setError(json.error);
        return;
      }
      setAiDrafts(json.drafts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "提案の取得に失敗しました");
    } finally {
      setAiPending(false);
    }
  }

  return (
    <div className="border-t border-rule bg-paper px-4 py-3">
      {error && <p className="text-xs text-crimson mb-2 px-1">{error}</p>}

      {aiDrafts.length > 0 && (
        <div className="mb-3 border border-violet bg-violet-bg px-3 py-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="caps text-violet">⚡ AI 返信文案</span>
            <button
              type="button"
              onClick={() => setAiDrafts([])}
              className="text-xs text-ink-3 hover:text-ink"
            >
              閉じる ×
            </button>
          </div>
          <div className="space-y-1.5">
            {aiDrafts.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setBody(d.body);
                  setAiDrafts([]);
                }}
                className="block w-full text-left text-sm bg-paper border border-rule px-3 py-2 hover:border-violet transition-colors"
              >
                <span className="caps text-violet mr-2">{d.label}</span>
                <span className="font-italic-serif text-ink-2">{d.body}</span>
              </button>
            ))}
          </div>
        </div>
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
          rows={2}
          placeholder={placeholder}
          className="flex-1 min-h-[44px] max-h-[160px] resize-y border border-rule-strong px-3 py-2 text-sm bg-paper focus:outline-none focus:border-plate"
        />
        <div className="flex flex-col gap-2">
          {suggestionsBuyerId && (
            <button
              type="button"
              onClick={fetchSuggestions}
              disabled={aiPending}
              className="shrink-0 inline-flex items-center gap-1 text-xs px-3 py-1.5 border border-violet text-violet hover:bg-violet-bg disabled:opacity-50 transition-colors"
              title="AI で文案を提案"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {aiPending ? "生成中" : "AI"}
            </button>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={pending || !body.trim()}
            className="shrink-0 inline-flex items-center justify-center w-10 h-10 bg-plate text-paper hover:bg-plate-deep disabled:opacity-40 transition-colors"
            aria-label="送信"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="caps mt-2 text-ink-3">⌘/Ctrl + Enter で送信</p>
    </div>
  );
}
