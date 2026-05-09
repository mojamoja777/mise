// components/admin/TenantSettingsForm.tsx
// 酒屋情報（tenant）の編集フォーム

"use client";

import { useState, useTransition } from "react";
import { updateTenantAction } from "@/app/(admin)/admin/settings/actions";
import type { Database } from "@/types/database";

type Tenant = Database["public"]["Tables"]["tenants"]["Row"];

type Props = {
  tenant: Tenant;
};

export function TenantSettingsForm({ tenant }: Props) {
  const [form, setForm] = useState({
    company_name: tenant.company_name,
    display_name: tenant.display_name,
    postal_code: tenant.postal_code ?? "",
    address: tenant.address ?? "",
    phone: tenant.phone ?? "",
    fax: tenant.fax ?? "",
    email: tenant.email ?? "",
    website_url: tenant.website_url ?? "",
    invoice_number: tenant.invoice_number ?? "",
    bank_info: tenant.bank_info ?? "",
    representative: tenant.representative ?? "",
    logo_url: tenant.logo_url ?? "",
    stamp_url: tenant.stamp_url ?? "",
    payment_terms_days: tenant.payment_terms_days,
  });
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const update = (key: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!form.company_name.trim()) {
      setMessage("エラー：正式社名は必須です");
      return;
    }
    if (!form.display_name.trim()) {
      setMessage("エラー：屋号は必須です");
      return;
    }
    if (form.payment_terms_days < 0) {
      setMessage("エラー：支払いサイトは0以上の値を指定してください");
      return;
    }

    startTransition(async () => {
      setMessage(null);
      const result = await updateTenantAction(tenant.id, form);
      if (result.ok) {
        setMessage("保存しました");
      } else {
        setMessage(`エラー：${result.error ?? "unknown"}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 基本情報 */}
      <Section title="基本情報">
        <Field label="正式社名" required>
          <input
            type="text"
            value={form.company_name}
            onChange={(e) => update("company_name", e.target.value)}
            placeholder="株式会社ヤマダ酒店"
            className={inputClass}
          />
        </Field>
        <Field label="屋号" required hint="請求書のヘッダなどに大きく表示されます">
          <input
            type="text"
            value={form.display_name}
            onChange={(e) => update("display_name", e.target.value)}
            placeholder="YAMADA WINE"
            className={inputClass}
          />
        </Field>
      </Section>

      {/* 連絡先 */}
      <Section title="連絡先">
        <Field label="郵便番号">
          <input
            type="text"
            value={form.postal_code}
            onChange={(e) => update("postal_code", e.target.value)}
            placeholder="150-0001"
            className={inputClass}
          />
        </Field>
        <Field label="住所">
          <input
            type="text"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            placeholder="東京都渋谷区神宮前1-2-3 ◯◯ビル4F"
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="電話番号">
            <input
              type="text"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="03-1234-5678"
              className={inputClass}
            />
          </Field>
          <Field label="FAX">
            <input
              type="text"
              value={form.fax}
              onChange={(e) => update("fax", e.target.value)}
              placeholder="03-1234-5679"
              className={inputClass}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="メールアドレス">
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="info@example.com"
              className={inputClass}
            />
          </Field>
          <Field label="ウェブサイトURL">
            <input
              type="url"
              value={form.website_url}
              onChange={(e) => update("website_url", e.target.value)}
              placeholder="https://example.com"
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      {/* 経理情報 */}
      <Section title="経理情報">
        <Field
          label="適格請求書発行事業者番号"
          hint="インボイス制度の登録番号（T + 13桁）"
        >
          <input
            type="text"
            value={form.invoice_number}
            onChange={(e) => update("invoice_number", e.target.value)}
            placeholder="T1234567890123"
            className={inputClass}
          />
        </Field>
        <Field label="代表者名">
          <input
            type="text"
            value={form.representative}
            onChange={(e) => update("representative", e.target.value)}
            placeholder="山田 太郎"
            className={inputClass}
          />
        </Field>
        <Field label="振込先口座" hint="複数行で入力可能">
          <textarea
            value={form.bank_info}
            onChange={(e) => update("bank_info", e.target.value)}
            rows={4}
            placeholder={"みずほ銀行 渋谷支店\n普通 1234567\nカ）ヤマダサケテン"}
            className={`${inputClass} resize-y`}
          />
        </Field>
      </Section>

      {/* 支払い設定 */}
      <Section title="支払い設定">
        <Field
          label="支払いサイト（日数）"
          hint="締め日から何日後が支払期限か（例：30日後＝翌月末払い）"
        >
          <input
            type="number"
            min={0}
            value={form.payment_terms_days}
            onChange={(e) =>
              update("payment_terms_days", Number(e.target.value))
            }
            className={`${inputClass} max-w-[120px]`}
          />
        </Field>
      </Section>

      {/* PDFブランディング */}
      <Section title="請求書PDFブランディング">
        <Field
          label="ロゴ画像URL"
          hint="請求書ヘッダ左上に表示されます。透過PNG推奨（高さ60px相当）"
        >
          <input
            type="url"
            value={form.logo_url}
            onChange={(e) => update("logo_url", e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
          {form.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.logo_url}
              alt="ロゴ プレビュー"
              className="mt-2 h-12 object-contain border border-rule rounded p-1 bg-white"
            />
          )}
        </Field>
        <Field
          label="印影画像URL"
          hint="請求書発行元の右下に重ねて表示されます。透過PNG推奨（120px四方）"
        >
          <input
            type="url"
            value={form.stamp_url}
            onChange={(e) => update("stamp_url", e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
          {form.stamp_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.stamp_url}
              alt="印影 プレビュー"
              className="mt-2 h-16 w-16 object-contain border border-rule rounded p-1 bg-white"
            />
          )}
        </Field>
      </Section>

      {/* 保存ボタン */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="bg-plate text-white px-6 py-2 rounded-lg text-sm hover:bg-plate-deep disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? "保存中..." : "変更を保存"}
        </button>
        {message && (
          <span
            className={`text-sm ${
              message.startsWith("エラー") ? "text-crimson" : "text-green-600"
            }`}
          >
            {message}
          </span>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "w-full text-sm border border-rule rounded-lg px-3 py-2 focus:outline-none focus:border-plate";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-float p-5">
      <h2 className="text-sm font-semibold text-ink-2 mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-2 mb-1">
        {label}
        {required && <span className="text-crimson ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-3 mt-1">{hint}</p>}
    </div>
  );
}
