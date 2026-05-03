// lib/mailer.ts
// Resend 経由のメール送信ヘルパ。
// RESEND_API_KEY が未設定の場合は警告ログだけで no-op 動作させる（dev/staging 用）。

import "server-only";
import { Resend } from "resend";
import type { ReactElement } from "react";

let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cachedClient) cachedClient = new Resend(key);
  return cachedClient;
}

function defaultFrom(): string {
  return (
    process.env.RESEND_FROM_EMAIL ?? "Mise <onboarding@resend.dev>"
  );
}

type SendArgs = {
  to: string | string[];
  subject: string;
  react: ReactElement;
  /** 送信失敗時に投げる代わりにログだけにするか */
  silent?: boolean;
};

/**
 * 通知メールを送信する。
 * - 受信者リストが空 / 環境変数未設定の場合は静かに skip
 * - silent=true（デフォルト）の場合は失敗時に throw せず警告のみ
 *   （業務処理を止めないため。失敗追跡は将来 Sentry / ロギング基盤で）
 */
export async function sendNotificationEmail({
  to,
  subject,
  react,
  silent = true,
}: SendArgs): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : to ? [to] : [];
  if (recipients.length === 0) return { ok: true, skipped: true };

  const client = getClient();
  if (!client) {
    console.warn(
      `[mailer] RESEND_API_KEY 未設定のためメール送信を skip: ${subject}`
    );
    return { ok: true, skipped: true };
  }

  try {
    const { error } = await client.emails.send({
      from: defaultFrom(),
      to: recipients,
      subject,
      react,
    });
    if (error) {
      const message = error.message ?? String(error);
      if (!silent) throw new Error(message);
      console.error(`[mailer] 送信失敗 (${subject}):`, message);
      return { ok: false, error: message };
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    if (!silent) throw e;
    console.error(`[mailer] 送信例外 (${subject}):`, message);
    return { ok: false, error: message };
  }
}
