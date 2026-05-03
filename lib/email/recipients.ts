// lib/email/recipients.ts
// 通知メールの宛先を解決するヘルパ。auth.users.email は service role でしか読めないため
// すべて service role 経由で取得する。Server Action / cron からのみ使用する想定。

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * 指定テナント内のアクティブな admin 全員のメールアドレスを返す。
 */
export async function getAdminEmails(tenantId: string): Promise<string[]> {
  const sc = createServiceClient();
  const { data: admins } = await sc
    .from("users")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("role", "admin")
    .eq("is_active", true);
  if (!admins?.length) return [];

  const emails: string[] = [];
  for (const admin of admins) {
    const { data } = await sc.auth.admin.getUserById(admin.id);
    const email = data.user?.email;
    if (email) emails.push(email);
  }
  return emails;
}

/**
 * 指定 buyer のメールアドレスを返す（無効・未認証なら null）。
 */
export async function getBuyerEmail(buyerId: string): Promise<string | null> {
  const sc = createServiceClient();
  const { data } = await sc.auth.admin.getUserById(buyerId);
  return data.user?.email ?? null;
}

/**
 * テナントの表示名（送信元ラベルとして使う）。
 * 未設定なら「Mise」を返す。
 */
export async function getTenantDisplayName(
  tenantId: string
): Promise<string> {
  const sc = createServiceClient();
  const { data } = await sc
    .from("tenants")
    .select("display_name, company_name")
    .eq("id", tenantId)
    .single();
  return data?.display_name || data?.company_name || "Mise";
}
