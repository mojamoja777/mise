// app/(admin)/admin/chat/[buyerId]/page.tsx
// 管理者 - 特定 buyer とのチャットスレッド

import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { fetchAdminThreads, fetchThreadMessages } from "@/lib/chat";
import { AdminThreadList } from "@/components/chat/AdminThreadList";
import { AdminThreadView } from "@/components/chat/AdminThreadView";
import {
  sendAdminMessage,
  markAdminThreadRead,
} from "../actions";

type Props = {
  params: Promise<{ buyerId: string }>;
};

export default async function AdminChatThreadPage({ params }: Props) {
  const { buyerId } = await params;
  const auth = await requireAdmin();
  if (!auth.ok) {
    return (
      <div className="p-8 text-sm text-red-600">{auth.error}</div>
    );
  }

  // 対象 buyer が同テナントか確認
  const { data: me } = await auth.supabase
    .from("users")
    .select("tenant_id")
    .eq("id", auth.user.id)
    .single();

  const { data: buyer } = await auth.supabase
    .from("users")
    .select("id, company_name, customer_code, is_active, tenant_id, role")
    .eq("id", buyerId)
    .single();

  if (
    !me?.tenant_id ||
    !buyer ||
    buyer.role !== "buyer" ||
    buyer.tenant_id !== me.tenant_id
  ) {
    notFound();
  }

  const [threads, messages] = await Promise.all([
    fetchAdminThreads(auth.supabase, auth.user.id),
    fetchThreadMessages(auth.supabase, buyerId),
  ]);

  // 既読位置を更新（スレッドを開いた時点で）
  await markAdminThreadRead(buyerId);

  const sendForBuyer = sendAdminMessage.bind(null, buyerId);

  return (
    <div className="flex h-screen">
      <AdminThreadList threads={threads} activeBuyerId={buyerId} />
      <AdminThreadView
        buyer={{
          id: buyer.id,
          companyName: buyer.company_name,
          customerCode: buyer.customer_code,
          isActive: buyer.is_active,
        }}
        messages={messages.map((m) => ({
          id: m.id,
          body: m.body,
          sender_id: m.sender_id,
          sender_role: m.sender_role,
          created_at: m.created_at,
          edited_at: m.edited_at,
          deleted_at: m.deleted_at,
        }))}
        currentUserId={auth.user.id}
        send={sendForBuyer}
      />
    </div>
  );
}
