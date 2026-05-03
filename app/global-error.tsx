"use client";

// app/global-error.tsx
// RootLayout 自体が落ちた場合のフォールバック
// 注: 自前で <html> / <body> を返す必要がある

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          background: "#f9fafb",
          fontFamily:
            "'Noto Sans JP', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          color: "#111827",
        }}
      >
        <p style={{ fontSize: 48, marginBottom: 16 }} aria-hidden>
          ⚠️
        </p>
        <h1
          style={{ fontSize: 24, fontWeight: 700, margin: 0, marginBottom: 8 }}
        >
          重大なエラーが発生しました
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "#6b7280",
            marginBottom: 24,
            textAlign: "center",
            maxWidth: 360,
          }}
        >
          ページの読み込みに失敗しました。再読み込みしてください。
        </p>
        {error.digest && (
          <p
            style={{
              fontSize: 12,
              color: "#9ca3af",
              fontFamily: "monospace",
              marginBottom: 24,
            }}
          >
            ref: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            padding: "10px 24px",
            background: "#6B1A35",
            color: "white",
            border: "none",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          再試行
        </button>
      </body>
    </html>
  );
}
