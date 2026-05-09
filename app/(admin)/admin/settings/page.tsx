// app/(admin)/admin/settings/page.tsx
// 管理者 - テナント設定（酒屋情報の編集）

import { createClient } from "@/lib/supabase/server";
import { TenantSettingsForm } from "@/components/admin/TenantSettingsForm";
import { PlateCorner } from "@/components/ui";

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  // 現在のユーザーの tenant を取得
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-8">
        <p className="text-sm text-crimson">未認証です</p>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    return (
      <div className="p-8">
        <p className="text-sm text-crimson">
          テナントに紐付けられていません。管理者に連絡してください。
        </p>
      </div>
    );
  }

  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", profile.tenant_id)
    .single();

  if (error || !tenant) {
    return (
      <div className="p-8">
        <p className="text-sm text-crimson">
          テナント情報の取得に失敗しました。
        </p>
      </div>
    );
  }

  return (
    <div className="px-10 pt-7 pb-10 max-w-4xl relative">
      <PlateCorner number="00" />

      <header className="border-b border-rule pb-5 mb-7">
        <p className="caps">House · Settings</p>
        <h1 className="font-serif text-5xl mt-2 tracking-tight">設定</h1>
        <p className="font-italic-serif text-base mt-2 text-ink-3">
          請求書・伝票に記載される酒屋情報を編集します
        </p>
      </header>

      <TenantSettingsForm tenant={tenant} />

      <p className="ornament mt-10" />
    </div>
  );
}
