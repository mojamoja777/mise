// app/not-found.tsx
// 404 Not Found ページ（全ルート共通フォールバック）

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gray-50">
      <p className="text-6xl mb-4" aria-hidden>
        🍷
      </p>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        ページが見つかりません
      </h1>
      <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">
        URL が変更されたか、削除された可能性があります。
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 bg-[#6B1A35] text-white rounded-xl text-sm font-medium hover:bg-[#9B2D50] transition-colors"
      >
        トップへ戻る
      </Link>
    </div>
  );
}
