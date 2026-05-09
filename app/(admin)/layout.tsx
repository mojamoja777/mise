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
      <Suspense fallback={<aside className="w-60 bg-paper border-r border-rule shrink-0" />}>
        <AdminSideNavWithUnread />
      </Suspense>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
