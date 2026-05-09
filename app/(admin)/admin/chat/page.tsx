// app/(admin)/admin/chat/page.tsx
// 管理者 - チャット一覧（左ペインのみ。スレッド未選択時のプレースホルダ）

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { fetchAdminThreads } from "@/lib/chat";
import { AdminThreadList } from "@/components/chat/AdminThreadList";

export default async function AdminChatPage() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return (
      <div className="p-8 text-sm text-crimson">{auth.error}</div>
    );
  }
  const threads = await fetchAdminThreads(auth.supabase, auth.user.id);

  return (
    <div className="flex h-screen">
      <AdminThreadList threads={threads} activeBuyerId={null} />
      <div className="flex-1 flex flex-col items-center justify-center bg-paper-2 text-ink-3">
        <MessageCircle className="w-10 h-10 mb-3" />
        <p className="text-sm">左の一覧から飲食店を選択してください</p>
        {threads.length === 0 && (
          <p className="text-xs mt-2">
            まだメッセージのやり取りはありません。
            <Link
              href="/admin/buyers"
              className="text-[#1c3a5c] hover:underline ml-1"
            >
              顧客一覧へ
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
