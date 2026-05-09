"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, FileText, MessageCircle, Settings, Sparkles, Users, Wine } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { StatusDot } from "@/components/ui";

const navItems = [
  { href: "/admin", label: "メッセージボックス", icon: Inbox, exact: true },
  { href: "/admin/allocations", label: "割り当て", icon: Sparkles, exact: false },
  { href: "/admin/chat", label: "チャット", icon: MessageCircle, exact: false },
];

const manageItems = [
  { href: "/admin/buyers", label: "顧客", icon: Users, exact: false },
  { href: "/admin/products", label: "商品", icon: Wine, exact: false },
  { href: "/admin/invoices", label: "請求書", icon: FileText, exact: false },
];

const settingsItems = [
  { href: "/admin/settings", label: "設定", icon: Settings, exact: false },
];

type Props = {
  chatUnread?: number;
};

export function AdminSideNav({ chatUnread = 0 }: Props) {
  const pathname = usePathname();

  const renderItem = (
    { href, label, icon: Icon, exact }: { href: string; label: string; icon: typeof Inbox; exact: boolean }
  ) => {
    const isActive = exact ? pathname === href : pathname.startsWith(href);
    const showChatBadge = href === "/admin/chat" && chatUnread > 0;
    return (
      <Link
        key={href}
        href={href}
        className={`flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors ${
          isActive ? "text-plate font-medium" : "text-ink-2 hover:text-plate"
        }`}
      >
        <StatusDot variant={isActive ? "plate" : "ink"} size={6} />
        <span className="flex-1">{label}</span>
        {showChatBadge && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-mono rounded-full bg-vermilion text-paper">
            {chatUnread > 99 ? "99+" : chatUnread}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="w-60 bg-paper-pale border-r border-rule flex flex-col shrink-0">
      <div className="px-5 pt-6 pb-5 border-b border-rule">
        <p className="font-serif text-3xl tracking-tight">Mise</p>
        <p className="caps mt-1">Maison du Vin · admin</p>
      </div>

      <nav className="flex-1 px-3 py-5 overflow-y-auto scroll">
        <p className="caps mb-3 px-3">Today</p>
        <div className="space-y-0.5 mb-7">{navItems.map(renderItem)}</div>

        <p className="caps mb-3 px-3">Manage</p>
        <div className="space-y-0.5 mb-7">{manageItems.map(renderItem)}</div>

        <p className="caps mb-3 px-3">House</p>
        <div className="space-y-0.5">{settingsItems.map(renderItem)}</div>
      </nav>

      <div className="border-t border-rule px-4 py-3 flex items-center justify-between gap-2">
        <LogoutButton />
        <kbd className="text-[10px] caps text-ink-3 border border-rule rounded px-1.5 py-0.5 whitespace-nowrap" title="グローバル検索">
          ⌘K
        </kbd>
      </div>
    </aside>
  );
}
