import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Next.js 16 Cache Components を有効化
  // 'use cache' / cacheTag / cacheLife を利用可能にする
  cacheComponents: true,
  // 商品登録画面のラベル写真アップロード（base64 で Server Action に送る）に備えて
  // Server Actions の body 上限を 8MB に拡張する
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  // セキュリティヘッダー
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // クリックジャッキング対策
          { key: "X-Frame-Options", value: "DENY" },
          // MIMEスニッフィング対策
          { key: "X-Content-Type-Options", value: "nosniff" },
          // リファラー制御
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // 不要なブラウザ機能を無効化
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // 外部画像ドメインの許可（Supabase Storage 使用時）
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "itcrnvjpwheetpokbegp.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
