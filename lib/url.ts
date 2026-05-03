// lib/url.ts
// 通知メール内のリンクで使う絶対 URL を組み立てる

const DEFAULT_BASE = "https://wine-saas.vercel.app";

export function appUrl(path: string): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_BASE;
  const base = raw.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
