import { LogOut } from "lucide-react";
import { logout } from "@/app/(auth)/login/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-ink-3 hover:text-plate hover:bg-paper-2 transition-colors w-full"
      >
        <LogOut className="w-4 h-4" />
        ログアウト
      </button>
    </form>
  );
}
