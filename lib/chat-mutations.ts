"use server";

// lib/chat-mutations.ts
// 自分のメッセージの編集 / 削除（admin・buyer 共通）
// RLS の chat_messages_update_own ポリシーで「sender_id = auth.uid()」のメッセージのみが更新可能

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";

type Result = { error: string | null };

/**
 * 自分のメッセージの本文を編集する
 */
export async function editChatMessage(
  messageId: string,
  body: string
): Promise<Result> {
  const auth = await requireAuth();
  if (!auth.ok) return { error: auth.error };

  const trimmed = body.trim();
  if (!trimmed) return { error: "本文が空です。" };
  if (trimmed.length > 4000) return { error: "本文が長すぎます（4000文字以内）。" };

  // RLS で sender_id = auth.uid() のみ UPDATE 可能。削除済みは触らない。
  const { error } = await auth.supabase
    .from("chat_messages")
    .update({ body: trimmed, edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .is("deleted_at", null);

  if (error) return { error: "編集に失敗しました。" };

  revalidatePath("/admin/chat");
  revalidatePath("/buyer/chat");
  return { error: null };
}

/**
 * 自分のメッセージをソフト削除する
 */
export async function deleteChatMessage(
  messageId: string
): Promise<Result> {
  const auth = await requireAuth();
  if (!auth.ok) return { error: auth.error };

  const { error } = await auth.supabase
    .from("chat_messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId)
    .is("deleted_at", null);

  if (error) return { error: "削除に失敗しました。" };

  revalidatePath("/admin/chat");
  revalidatePath("/buyer/chat");
  return { error: null };
}
