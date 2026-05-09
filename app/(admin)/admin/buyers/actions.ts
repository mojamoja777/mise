// app/(admin)/admin/buyers/actions.ts
// 飲食店（buyer）の管理アクション（新規登録・編集・有効無効切り替え）

"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type BuyerInput = {
  email: string;
  company_name: string;
  customer_code: string | null;
  postal_code: string | null;
  address: string | null;
  phone: string | null;
  tier?: "gold" | "silver" | "bronze";
  taste_tags?: string[];
  internal_note?: string | null;
};

/**
 * ランダムパスワードを生成（英数字12文字）
 */
function generatePassword(length = 12): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * admin 権限とテナント情報を確認する共通ヘルパー
 */
type AdminGuard =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; tenantId: string }
  | { ok: false; error: string };

async function requireAdmin(): Promise<AdminGuard> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未認証です" };

  const { data: profile } = await supabase
    .from("users")
    .select("role, tenant_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { ok: false, error: "管理者権限が必要です" };
  }
  return { ok: true, supabase, tenantId: profile.tenant_id };
}

const normalize = (v: string | null | undefined) =>
  v === undefined ? undefined : v === "" ? null : v;

/**
 * 新規 buyer を登録する
 * Supabase Auth アカウントを作成し、users テーブルにレコードを追加
 * 戻り値にランダム生成したパスワードを含める（画面で一度だけ表示）
 */
export async function createBuyerAction(
  input: BuyerInput
): Promise<
  | { ok: true; userId: string; password: string }
  | { ok: false; error: string }
> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const { tenantId } = guard;

  if (!input.email.trim()) return { ok: false, error: "メールアドレスは必須です" };
  if (!input.company_name.trim())
    return { ok: false, error: "会社名は必須です" };

  const serviceClient = createServiceClient();
  const password = generatePassword();

  // Supabase Auth アカウントを作成（ロールを app_metadata にセット）
  const { data: authResult, error: authError } =
    await serviceClient.auth.admin.createUser({
      email: input.email.trim(),
      password,
      email_confirm: true,
      app_metadata: { role: "buyer" },
    });

  if (authError || !authResult.user) {
    return {
      ok: false,
      error: `Auth アカウント作成に失敗: ${authError?.message ?? "unknown"}`,
    };
  }

  const userId = authResult.user.id;

  // users テーブルに挿入
  const { error: insertError } = await serviceClient.from("users").insert({
    id: userId,
    role: "buyer",
    company_name: input.company_name.trim(),
    tenant_id: tenantId,
    customer_code: normalize(input.customer_code) ?? null,
    postal_code: normalize(input.postal_code) ?? null,
    address: normalize(input.address) ?? null,
    phone: normalize(input.phone) ?? null,
    is_active: true,
  });

  if (insertError) {
    // users 挿入失敗時は Auth アカウントを削除してロールバック
    await serviceClient.auth.admin.deleteUser(userId);
    return {
      ok: false,
      error: `ユーザー情報の保存に失敗: ${insertError.message}`,
    };
  }

  revalidatePath("/admin/buyers");
  return { ok: true, userId, password };
}

/**
 * buyer 情報を更新する（メールアドレスは編集不可）
 */
export async function updateBuyerAction(
  buyerId: string,
  input: Omit<BuyerInput, "email">
): Promise<{ ok: boolean; error?: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const { supabase, tenantId } = guard;

  if (!input.company_name.trim())
    return { ok: false, error: "会社名は必須です" };

  // 同一テナント内のユーザーであることを確認
  const { data: target } = await supabase
    .from("users")
    .select("tenant_id, role")
    .eq("id", buyerId)
    .single();

  if (!target || target.tenant_id !== tenantId || target.role !== "buyer") {
    return { ok: false, error: "編集対象が見つかりません" };
  }

  const { error } = await supabase
    .from("users")
    .update({
      company_name: input.company_name.trim(),
      customer_code: normalize(input.customer_code),
      postal_code: normalize(input.postal_code),
      address: normalize(input.address),
      phone: normalize(input.phone),
      ...(input.tier ? { tier: input.tier } : {}),
      ...(input.taste_tags ? { taste_tags: input.taste_tags } : {}),
      ...(input.internal_note !== undefined
        ? { internal_note: normalize(input.internal_note) }
        : {}),
    })
    .eq("id", buyerId);

  if (error) return { ok: false, error: `更新に失敗: ${error.message}` };

  revalidatePath("/admin/buyers");
  revalidatePath(`/admin/buyers/${buyerId}/edit`);
  return { ok: true };
}

/**
 * buyer の有効/無効を切り替える
 * 無効化時は Supabase Auth 側でも ban して以後ログインできないようにする
 */
export async function toggleBuyerActiveAction(
  buyerId: string,
  nextActive: boolean
): Promise<{ ok: boolean; error?: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const { supabase, tenantId } = guard;

  const { data: target } = await supabase
    .from("users")
    .select("tenant_id, role")
    .eq("id", buyerId)
    .single();

  if (!target || target.tenant_id !== tenantId || target.role !== "buyer") {
    return { ok: false, error: "対象が見つかりません" };
  }

  const serviceClient = createServiceClient();

  // DBフラグを更新
  const { error: updateError } = await serviceClient
    .from("users")
    .update({ is_active: nextActive })
    .eq("id", buyerId);

  if (updateError) {
    return { ok: false, error: `DB更新に失敗: ${updateError.message}` };
  }

  // Supabase Auth 側で ban / unban
  const { error: authError } = await serviceClient.auth.admin.updateUserById(
    buyerId,
    {
      // 無効化: 100年 ban。有効化: ban 解除（"none"）
      ban_duration: nextActive ? "none" : "876000h",
    }
  );

  if (authError) {
    return { ok: false, error: `Auth 更新に失敗: ${authError.message}` };
  }

  revalidatePath("/admin/buyers");
  revalidatePath(`/admin/buyers/${buyerId}/edit`);
  return { ok: true };
}
