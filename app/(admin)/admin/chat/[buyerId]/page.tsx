import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { fetchAdminThreads, fetchThreadMessages } from "@/lib/chat";
import { AdminThreadList } from "@/components/chat/AdminThreadList";
import { AdminThreadView } from "@/components/chat/AdminThreadView";
import { CustomerProfile } from "@/components/admin/CustomerProfile";
import { sendAdminMessage } from "../actions";

type Props = {
  params: Promise<{ buyerId: string }>;
};

export default async function AdminChatThreadPage({ params }: Props) {
  const { buyerId } = await params;
  const auth = await requireAdmin();
  if (!auth.ok) {
    return <div className="p-8 text-sm text-crimson">{auth.error}</div>;
  }

  const { data: me } = await auth.supabase
    .from("users")
    .select("tenant_id")
    .eq("id", auth.user.id)
    .single();

  const { data: buyer } = await auth.supabase
    .from("users")
    .select(
      "id, company_name, customer_code, is_active, tenant_id, role, address, phone, tier, taste_tags, internal_note, created_at",
    )
    .eq("id", buyerId)
    .single();

  if (!me?.tenant_id || !buyer || buyer.role !== "buyer" || buyer.tenant_id !== me.tenant_id) {
    notFound();
  }

  const [threads, messages, statsResult] = await Promise.all([
    fetchAdminThreads(auth.supabase, auth.user.id),
    fetchThreadMessages(auth.supabase, buyerId),
    auth.supabase.from("buyer_stats").select("*").eq("buyer_id", buyerId).maybeSingle(),
  ]);

  await auth.supabase
    .from("chat_read_states")
    .upsert(
      {
        admin_id: auth.user.id,
        buyer_id: buyerId,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: "admin_id,buyer_id" },
    );

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
      <CustomerProfile
        buyer={{
          id: buyer.id,
          company_name: buyer.company_name,
          customer_code: buyer.customer_code,
          address: buyer.address,
          phone: buyer.phone,
          tier: buyer.tier,
          taste_tags: buyer.taste_tags,
          internal_note: buyer.internal_note,
          created_at: buyer.created_at,
        }}
        stats={statsResult.data ?? null}
      />
    </div>
  );
}
