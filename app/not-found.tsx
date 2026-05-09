// app/not-found.tsx
// 404 Not Found ページ（全ルート共通フォールバック）

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-paper-2">
      <p className="text-6xl mb-4" aria-hidden>
        🍷
      </p>
      <h1 className="text-2xl font-bold text-ink mb-2">
        ページが見つかりません
      </h1>
      <p className="text-sm text-ink-3 mb-6 text-center max-w-sm">
        URL が変更されたか、削除された可能性があります。
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 bg-[#1c3a5c] text-white rounded-xl text-sm font-medium hover:bg-[#0e2238] transition-colors"
      >
        トップへ戻る
      </Link>
    </div>
  );
}
