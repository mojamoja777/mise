// app/(print)/layout.tsx
// 印刷専用レイアウト（ナビゲーション非表示）

import { Suspense } from "react";

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      {children}
    </Suspense>
  );
}
