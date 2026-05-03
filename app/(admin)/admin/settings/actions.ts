// app/(admin)/admin/settings/actions.ts
// tenant 情報を更新するサーバーアクション

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import type { Database } from "@/types/database";

type TenantUpdate = Database["public"]["Tables"]["tenants"]["Update"];

export async function updateTenantAction(
  tenantId: string,
  input: TenantUpdate
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const { data: profile } = await auth.supabase
    .from("users")
    .select("tenant_id")
    .eq("id", auth.user.id)
    .single();
  if (profile?.tenant_id !== tenantId) {
    return { ok: false, error: "他のテナントは編集できません" };
  }

  // 空文字は NULL に正規化
  const normalize = (v: string | null | undefined) =>
    v === undefined ? undefined : v === "" ? null : v;

  const { error } = await auth.supabase
    .from("tenants")
    .update({
      company_name: input.company_name,
      display_name: input.display_name,
      postal_code: normalize(input.postal_code),
      address: normalize(input.address),
      phone: normalize(input.phone),
      fax: normalize(input.fax),
      email: normalize(input.email),
      website_url: normalize(input.website_url),
      invoice_number: normalize(input.invoice_number),
      bank_info: normalize(input.bank_info),
      representative: normalize(input.representative),
      logo_url: normalize(input.logo_url),
      stamp_url: normalize(input.stamp_url),
      payment_terms_days: input.payment_terms_days,
    })
    .eq("id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました: ${error.message}` };
  }

  revalidatePath("/admin/settings");
  return { ok: true };
}
