// lib/auth.ts
// Server Action / Route Handler 用の認可ヘルパ
// RLS 任せにせず Server 側でも明示的に role を検証する（二重防御）

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

export type AuthGuard =
  | { ok: true; supabase: SupabaseClient<Database>; user: User }
  | { ok: false; error: string };

/**
 * 管理者であることを要求するガード。
 * 失敗した場合は呼び出し元に文字列エラーを返してハンドリングしてもらう。
 */
export async function requireAdmin(): Promise<AuthGuard> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です。" };
  const role = user.app_metadata?.role;
  if (role !== "admin") return { ok: false, error: "管理者権限が必要です。" };
  return { ok: true, supabase, user };
}

/**
 * 発注者であることを要求するガード。
 */
export async function requireBuyer(): Promise<AuthGuard> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です。" };
  const role = user.app_metadata?.role;
  if (role !== "buyer") return { ok: false, error: "発注者権限が必要です。" };
  return { ok: true, supabase, user };
}

/**
 * いずれかのロールにログイン済みであることを要求する（用途は限定的）
 */
export async function requireAuth(): Promise<AuthGuard> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "ログインが必要です。" };
  return { ok: true, supabase, user };
}

/**
 * PostgREST の or() / ilike() に渡す検索キーワードをサニタイズする。
 * カンマ・括弧・カラン・引用符などの構文文字を除去する。
 */
export function sanitizeSearchKeyword(input: string): string {
  return input.replace(/[(),:.*"'`\\]/g, "").trim();
}
