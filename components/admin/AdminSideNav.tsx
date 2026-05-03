"use client";

// components/admin/AdminSideNav.tsx
// 管理者サイドナビゲーション（アクティブ状態付き）

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, FileText, MessageCircle, Settings, Sparkles, Users, Wine } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";

const navItems = [
  { href: "/admin", label: "発注一覧", icon: ClipboardList, exact: true },
  { href: "/admin/chat", label: "チャット", icon: MessageCircle, exact: false },
  { href: "/admin/allocations", label: "割り当て", icon: Sparkles, exact: false },
  { href: "/admin/buyers", label: "顧客管理", icon: Users, exact: false },
  { href: "/admin/products", label: "商品管理", icon: Wine, exact: false },
  { href: "/admin/invoices", label: "請求書", icon: FileText, exact: false },
];

const settingsItems = [
  { href: "/admin/settings", label: "設定", icon: Settings, exact: false },
];

type Props = {
  /** チャット未読合計（admin の全 buyer 合算） */
  chatUnread?: number;
};

export function AdminSideNav({ chatUnread = 0 }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#3B0A1E] text-white flex flex-col px-4 py-6 shrink-0">
      {/* ロゴ */}
      <div className="mb-8 px-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍷</span>
          <span className="text-base font-semibold">Wine Order</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">管理画面</p>
      </div>

      {/* ナビメニュー */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          const showChatBadge = href === "/admin/chat" && chatUnread > 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-[#6B1A35] text-white"
                  : "text-gray-200 hover:bg-[#6B1A35] hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1">{label}</span>
              {showChatBadge && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-[#B8860B] text-white">
                  {chatUnread > 99 ? "99+" : chatUnread}
                </span>
              )}
            </Link>
          );
        })}

        {/* 区切り */}
        <div className="my-3 border-t border-white/10" />

        {settingsItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-[#6B1A35] text-white"
                  : "text-gray-200 hover:bg-[#6B1A35] hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* ログアウト */}
      <div className="mt-auto">
        <LogoutButton />
      </div>
    </aside>
  );
}
