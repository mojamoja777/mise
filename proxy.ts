// proxy.ts
// 全ルートで実行されるプロキシ
// 認証状態の確認・セッションの更新・ロール別リダイレクトを行う

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // JWT のローカル検証だけで認証情報を取得（Supabase Auth に毎回往復しないため軽量）
  // Server Action / Page では別途 supabase.auth.getUser() で改ざん防止検証を行う
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const role = claims?.app_metadata?.role as "admin" | "buyer" | undefined;

  const pathname = request.nextUrl.pathname;

  // ログインページ・トップ：認証済みならロール別ページにリダイレクト
  if (pathname === "/login" || pathname === "/") {
    if (claims) {
      if (role === "admin") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      if (role === "buyer") {
        return NextResponse.redirect(new URL("/buyer", request.url));
      }
    }
    return supabaseResponse;
  }

  // 管理者ページのアクセス制御
  if (pathname.startsWith("/admin")) {
    if (!claims) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/buyer", request.url));
    }
  }

  // 発注者ページのアクセス制御
  if (pathname.startsWith("/buyer")) {
    if (!claims) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (role !== "buyer") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
