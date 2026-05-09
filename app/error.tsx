"use client";

// app/error.tsx
// Server Component / Client Component から throw されたエラーをキャッチする境界
// RootLayout が壊れた場合は global-error.tsx に切り替わる

import { useEffect } from "react";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // ここで Sentry / Logflare 等にエラーを送る予定の差し込み点
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-paper-2">
      <p className="text-5xl mb-4" aria-hidden>
        ⚠️
      </p>
      <h1 className="text-2xl font-bold text-ink mb-2">
        問題が発生しました
      </h1>
      <p className="text-sm text-ink-3 mb-6 text-center max-w-sm">
        画面の読み込みに失敗しました。再試行しても改善しない場合はサポートまでご連絡ください。
      </p>
      {error.digest && (
        <p className="text-xs text-ink-3 mb-6 font-mono">
          ref: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="px-6 py-2.5 bg-[#1c3a5c] text-white rounded-xl text-sm font-medium hover:bg-[#0e2238] transition-colors"
      >
        再試行
      </button>
    </div>
  );
}
