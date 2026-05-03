// lib/chat.ts
// チャット機能のサーバ側ヘルパ。Server Component / Server Action から共用する。

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type ChatMessage =
  Database["public"]["Tables"]["chat_messages"]["Row"];

export type AdminChatThread =
  Database["public"]["Functions"]["list_admin_chat_threads"]["Returns"][number];

/**
 * 指定スレッドのメッセージを古い順で取得する。
 * RLS により呼び出し元から見えるメッセージだけが返る。
 */
export async function fetchThreadMessages(
  supabase: SupabaseClient<Database>,
  buyerId: string,
  limit = 200
): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: true })
    .limit(limit);
  return data ?? [];
}

/**
 * admin の左ペインに出すスレッド一覧（buyer ごとの最終メッセージ + 未読件数）。
 */
export async function fetchAdminThreads(
  supabase: SupabaseClient<Database>,
  adminId: string
): Promise<AdminChatThread[]> {
  const { data } = await supabase.rpc("list_admin_chat_threads", {
    p_admin_id: adminId,
  });
  return data ?? [];
}

/**
 * admin のグローバルバッジ用に、全 buyer の未読合計を返す。
 */
export async function countAdminChatUnread(
  supabase: SupabaseClient<Database>,
  adminId: string
): Promise<number> {
  const threads = await fetchAdminThreads(supabase, adminId);
  return threads.reduce((sum, t) => sum + t.unread_count, 0);
}

/**
 * buyer のボトムナビ用に、admin からの未読件数を返す。
 */
export async function countBuyerChatUnread(
  supabase: SupabaseClient<Database>,
  buyerId: string,
  lastSeenAt: string | null
): Promise<number> {
  const { count } = await supabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("buyer_id", buyerId)
    .eq("sender_role", "admin")
    .is("deleted_at", null)
    .gt("created_at", lastSeenAt ?? "1970-01-01T00:00:00Z");
  return count ?? 0;
}
