// components/admin/BuyerForm.tsx
// 飲食店（buyer）の新規登録・編集フォーム

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import {
  createBuyerAction,
  toggleBuyerActiveAction,
  updateBuyerAction,
} from "@/app/(admin)/admin/buyers/actions";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  initial?: {
    id: string;
    email: string;
    company_name: string;
    customer_code: string | null;
    postal_code: string | null;
    address: string | null;
    phone: string | null;
    is_active: boolean;
    tier?: "gold" | "silver" | "bronze";
    taste_tags?: string[];
    internal_note?: string | null;
  };
};

export function BuyerForm({ mode, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    email: initial?.email ?? "",
    company_name: initial?.company_name ?? "",
    customer_code: initial?.customer_code ?? "",
    postal_code: initial?.postal_code ?? "",
    address: initial?.address ?? "",
    phone: initial?.phone ?? "",
    tier: (initial?.tier ?? "bronze") as "gold" | "silver" | "bronze",
    taste_tags_input: (initial?.taste_tags ?? []).join(", "),
    internal_note: initial?.internal_note ?? "",
  });
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(
    null
  );

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const tasteTagsArray = form.taste_tags_input
    .split(/[,、]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const handleSubmit = () => {
    startTransition(async () => {
      setMessage(null);
      setGeneratedPassword(null);

      if (mode === "create") {
        const result = await createBuyerAction({
          email: form.email,
          company_name: form.company_name,
          customer_code: form.customer_code || null,
          postal_code: form.postal_code || null,
          address: form.address || null,
          phone: form.phone || null,
        });
        if (result.ok) {
          setGeneratedPassword(result.password);
          setMessage("登録しました。下記の初期パスワードを顧客にお伝えください。");
        } else {
          setMessage(`エラー：${result.error}`);
        }
      } else if (mode === "edit" && initial) {
        const result = await updateBuyerAction(initial.id, {
          company_name: form.company_name,
          customer_code: form.customer_code || null,
          postal_code: form.postal_code || null,
          address: form.address || null,
          phone: form.phone || null,
          tier: form.tier,
          taste_tags: tasteTagsArray,
          internal_note: form.internal_note || null,
        });
        if (result.ok) {
          setMessage("保存しました");
        } else {
          setMessage(`エラー：${result.error}`);
        }
      }
    });
  };

  const handleToggleActive = () => {
    if (!initial) return;
    const next = !initial.is_active;
    const confirmMsg = next
      ? "この顧客を有効にしますか？"
      : "この顧客を無効にしますか？無効化するとログインできなくなります。";
    if (!window.confirm(confirmMsg)) return;

    startTransition(async () => {
      const result = await toggleBuyerActiveAction(initial.id, next);
      if (result.ok) {
        router.refresh();
      } else {
        setMessage(`エラー：${result.error}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 基本情報 */}
      <Section title="アカウント情報">
        <Field label="メールアドレス" required>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            disabled={mode === "edit"}
            placeholder="buyer@example.com"
            className={`${inputClass} ${
              mode === "edit" ? "bg-paper-2 text-ink-3" : ""
            }`}
          />
          {mode === "edit" && (
            <p className="text-xs text-ink-3 mt-1">
              メールアドレスは編集できません
            </p>
          )}
        </Field>
      </Section>

      {/* 顧客情報 */}
      <Section title="顧客情報">
        <Field label="会社名" required>
          <input
            type="text"
            value={form.company_name}
            onChange={(e) => update("company_name", e.target.value)}
            placeholder="株式会社◯◯レストラン"
            className={inputClass}
          />
        </Field>
        <Field
          label="お客様コード"
          hint="酒屋で管理する一意のコード（例: C-0001）"
        >
          <input
            type="text"
            value={form.customer_code}
            onChange={(e) => update("customer_code", e.target.value)}
            placeholder="C-0001"
            className={inputClass}
          />
        </Field>
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
            placeholder="東京都渋谷区神宮前1-2-3"
            className={inputClass}
          />
        </Field>
        <Field label="電話番号">
          <input
            type="text"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="03-1234-5678"
            className={inputClass}
          />
        </Field>
      </Section>

      {/* 顧客カルテ（mode === edit のみ） */}
      {mode === "edit" && (
        <Section title="顧客カルテ">
          <Field
            label="ティア"
            hint="割当の優先度や AI 提案の判断材料に使われます"
          >
            <div className="flex gap-2">
              {(["gold", "silver", "bronze"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, tier: t }))}
                  className={`px-4 py-1.5 text-sm border transition-colors capitalize ${
                    form.tier === t
                      ? "bg-plate text-paper border-plate"
                      : "bg-paper border-rule-strong text-ink-2 hover:border-plate"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>
          <Field
            label="嗜好タグ"
            hint="カンマまたは、で区切る（例: Champagne, Bourgogne 白, 純米大吟醸）"
          >
            <input
              type="text"
              value={form.taste_tags_input}
              onChange={(e) => update("taste_tags_input", e.target.value)}
              placeholder="Champagne, Bourgogne 白"
              className={inputClass}
            />
            {tasteTagsArray.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tasteTagsArray.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 text-[11px] border border-rule-strong text-ink-2 font-italic-serif"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </Field>
          <Field
            label="店主メモ"
            hint="この内容は買い手側からは見えません"
          >
            <textarea
              value={form.internal_note}
              onChange={(e) => update("internal_note", e.target.value)}
              rows={4}
              placeholder="例: 月初の発注が多い。Egly 系の入荷時は優先案内"
              className={inputClass + " resize-y leading-relaxed"}
            />
          </Field>
        </Section>
      )}

      {/* 初期パスワード表示 */}
      {generatedPassword && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-5">
          <p className="text-sm font-semibold text-yellow-900 mb-2">
            初期パスワード（一度だけ表示されます）
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-yellow-200 rounded px-3 py-2 font-mono text-base text-ink">
              {generatedPassword}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(generatedPassword);
                alert("コピーしました");
              }}
              className="p-2 text-amber hover:bg-amber-bg rounded"
              aria-label="パスワードをコピー"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-yellow-800 mt-2">
            このパスワードはこの画面を離れると再表示できません。
            LINEや電話などで顧客にお伝えください。
          </p>
        </div>
      )}

      {/* 保存・有効無効切り替え */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="bg-[#1c3a5c] text-white px-6 py-2 rounded-lg text-sm hover:bg-[#0e2238] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending
            ? "処理中..."
            : mode === "create"
              ? "登録する"
              : "変更を保存"}
        </button>

        {mode === "edit" && initial && (
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={pending}
            className={`px-4 py-2 rounded-lg text-sm border transition-colors disabled:opacity-50 ${
              initial.is_active
                ? "border-red-300 text-crimson hover:bg-crimson-bg"
                : "border-green-300 text-green-700 hover:bg-green-50"
            }`}
          >
            {initial.is_active ? "無効化する" : "有効化する"}
          </button>
        )}

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
  "w-full text-sm border border-rule rounded-lg px-3 py-2 focus:outline-none focus:border-[#1c3a5c]";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-rule p-5">
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
