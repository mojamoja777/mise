"use server";

import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/mailer";
import { ChatMessageEmail } from "@/lib/email/ChatMessage";
import { getBuyerEmail, getTenantDisplayName } from "@/lib/email/recipients";
import { appUrl } from "@/lib/url";

type Result = { error: string | null };

/**
 * admin が指定 buyer にメッセージを送る
 */
export async function sendAdminMessage(
  buyerId: string,
  body: string
): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const trimmed = body.trim();
  if (!trimmed) return { error: "本文が空です。" };
  if (trimmed.length > 4000) return { error: "本文が長すぎます（4000文字以内）。" };

  // 自テナントの buyer か確認
  const { data: me } = await auth.supabase
    .from("users")
    .select("tenant_id")
    .eq("id", auth.user.id)
    .single();
  if (!me?.tenant_id) return { error: "テナント情報が取得できません。" };

  const { data: buyer } = await auth.supabase
    .from("users")
    .select("tenant_id, role")
    .eq("id", buyerId)
    .single();
  if (!buyer || buyer.role !== "buyer" || buyer.tenant_id !== me.tenant_id) {
    return { error: "対象の飲食店が見つかりません。" };
  }

  const { error } = await auth.supabase.from("chat_messages").insert({
    tenant_id: me.tenant_id,
    buyer_id: buyerId,
    sender_id: auth.user.id,
    sender_role: "admin",
    body: trimmed,
  });
  if (error) return { error: "メッセージ送信に失敗しました。" };

  // 自分の既読位置も更新（送信は自分が読んだことと同義）
  await auth.supabase
    .from("chat_read_states")
    .upsert(
      { admin_id: auth.user.id, buyer_id: buyerId, last_read_at: new Date().toISOString() },
      { onConflict: "admin_id,buyer_id" }
    );

  // buyer に新着通知メール（buyer が今アプリを開いていない場合の保険）
  const [recipientEmail, senderLabel, buyerProfile] = await Promise.all([
    getBuyerEmail(buyerId),
    getTenantDisplayName(me.tenant_id),
    auth.supabase
      .from("users")
      .select("company_name")
      .eq("id", buyerId)
      .single(),
  ]);
  if (recipientEmail) {
    await sendNotificationEmail({
      to: recipientEmail,
      subject: `${senderLabel} よりメッセージが届きました`,
      react: createElement(ChatMessageEmail, {
        recipientName: buyerProfile.data?.company_name ?? "",
        senderLabel,
        body: trimmed,
        threadUrl: appUrl("/buyer/chat"),
      }),
    });
  }

  revalidatePath("/admin/chat");
  revalidatePath(`/admin/chat/${buyerId}`);
  return { error: null };
}

/**
 * admin が指定 buyer のスレッドを開いた／既読位置を更新する
 */
export async function markAdminThreadRead(buyerId: string): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const { error } = await auth.supabase
    .from("chat_read_states")
    .upsert(
      { admin_id: auth.user.id, buyer_id: buyerId, last_read_at: new Date().toISOString() },
      { onConflict: "admin_id,buyer_id" }
    );
  if (error) return { error: "既読の更新に失敗しました。" };

  // NOTE: page render 中に呼ばれる前提なので revalidatePath は呼ばない（Next.js 16 制約）
  return { error: null };
}
