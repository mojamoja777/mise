// app/(admin)/layout.tsx
// 管理者ページ共通レイアウト（サイドナビゲーション付き）

import { Suspense } from "react";
import { AdminSideNav } from "@/components/admin/AdminSideNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* AdminSideNav は usePathname を使うため Cache Components 下で Suspense が必要 */}
      <Suspense fallback={<aside className="w-64 bg-[#3B0A1E] shrink-0" />}>
        <AdminSideNav />
      </Suspense>
      <main className="flex-1 bg-gray-100 overflow-auto">{children}</main>
    </div>
  );
}
