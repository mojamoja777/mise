"use server";

import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { requireBuyer } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/mailer";
import { ChatMessageEmail } from "@/lib/email/ChatMessage";
import { getAdminEmails } from "@/lib/email/recipients";
import { appUrl } from "@/lib/url";

type Result = { error: string | null };

/**
 * buyer が admin にメッセージを送る
 */
export async function sendBuyerMessage(body: string): Promise<Result> {
  const auth = await requireBuyer();
  if (!auth.ok) return { error: auth.error };

  const trimmed = body.trim();
  if (!trimmed) return { error: "本文が空です。" };
  if (trimmed.length > 4000) return { error: "本文が長すぎます（4000文字以内）。" };

  const { data: me } = await auth.supabase
    .from("users")
    .select("tenant_id")
    .eq("id", auth.user.id)
    .single();
  if (!me?.tenant_id) return { error: "テナント情報が取得できません。" };

  const { error } = await auth.supabase.from("chat_messages").insert({
    tenant_id: me.tenant_id,
    buyer_id: auth.user.id,
    sender_id: auth.user.id,
    sender_role: "buyer",
    body: trimmed,
  });
  if (error) return { error: "メッセージ送信に失敗しました。" };

  // 自分の既読位置を更新
  await auth.supabase
    .from("users")
    .update({ last_chat_seen_at: new Date().toISOString() })
    .eq("id", auth.user.id);

  // admin 全員に新着通知メール
  const { data: profile } = await auth.supabase
    .from("users")
    .select("company_name")
    .eq("id", auth.user.id)
    .single();
  const adminEmails = await getAdminEmails(me.tenant_id);
  if (adminEmails.length > 0 && profile) {
    await sendNotificationEmail({
      to: adminEmails,
      subject: `${profile.company_name} 様よりチャット新着`,
      react: createElement(ChatMessageEmail, {
        recipientName: "",
        senderLabel: profile.company_name,
        body: trimmed,
        threadUrl: appUrl(`/admin/chat/${auth.user.id}`),
      }),
    });
  }

  revalidatePath("/buyer/chat");
  return { error: null };
}

/**
 * buyer がスレッドを開いた／既読位置を更新
 */
export async function markBuyerThreadRead(): Promise<Result> {
  const auth = await requireBuyer();
  if (!auth.ok) return { error: auth.error };

  const { error } = await auth.supabase
    .from("users")
    .update({ last_chat_seen_at: new Date().toISOString() })
    .eq("id", auth.user.id);
  if (error) return { error: "既読の更新に失敗しました。" };

  revalidatePath("/buyer/chat");
  return { error: null };
}
