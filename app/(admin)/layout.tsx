// app/(admin)/layout.tsx
// 管理者ページ共通レイアウト（サイドナビゲーション付き）

import { Suspense } from "react";
import { AdminSideNav } from "@/components/admin/AdminSideNav";
import { requireAdmin } from "@/lib/auth";
import { countAdminChatUnread } from "@/lib/chat";

async function AdminSideNavWithUnread() {
  const auth = await requireAdmin();
  let chatUnread = 0;
  if (auth.ok) {
    chatUnread = await countAdminChatUnread(auth.supabase, auth.user.id);
  }
  return <AdminSideNav chatUnread={chatUnread} />;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* 未読数取得の往復が page render を止めないよう Suspense でラップ */}
      <Suspense fallback={<aside className="w-64 bg-[#3B0A1E] shrink-0" />}>
        <AdminSideNavWithUnread />
      </Suspense>
      <main className="flex-1 bg-gray-100 overflow-auto">{children}</main>
    </div>
  );
}
