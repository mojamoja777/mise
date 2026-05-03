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
