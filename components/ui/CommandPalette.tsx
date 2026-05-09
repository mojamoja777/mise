"use client";

// components/ui/CommandPalette.tsx
// ⌘K / Ctrl+K でグローバル検索パレットを開く。
// 商品（admin / buyer）と飲食店（admin のみ）を横断検索し、選択で詳細ページへ遷移。

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, Wine, Store, X } from "lucide-react";
import type { SearchResult } from "@/app/api/search/route";

type Props = {
  /** "admin" なら飲食店も検索対象、"buyer" は商品のみ */
  role: "admin" | "buyer";
};

export function CommandPalette({ role }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({
    products: [],
    buyers: [],
  });
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // グローバル ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // クエリ変更で 200ms debounce 後に検索
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length === 0) {
      setResults({ products: [], buyers: [] });
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await fetch(
            `/api/search?q=${encodeURIComponent(query.trim())}`
          );
          if (!res.ok) return;
          const data = (await res.json()) as SearchResult;
          setResults(data);
        } catch {
          // network 失敗は無視（結果空のまま）
        }
      });
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // open 時に query をリセット
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults({ products: [], buyers: [] });
    }
  }, [open]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/30 px-4 pt-[15vh]"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <Command
        className="w-full max-w-2xl rounded-xl border border-rule bg-paper-cream shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        label="Global search"
        shouldFilter={false}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-rule">
          <Search className="w-4 h-4 text-ink-3 shrink-0" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder={
              role === "admin"
                ? "商品名・生産者・地域・店舗名・お客様コードで検索…"
                : "商品名・生産者・地域で検索…"
            }
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-4"
            autoFocus
          />
          <kbd className="text-[10px] text-ink-3 caps border border-rule rounded px-1.5 py-0.5">
            ESC
          </kbd>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-ink-3 hover:text-ink"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          {isPending && (
            <p className="text-xs text-ink-3 px-3 py-4 text-center">検索中…</p>
          )}

          {!isPending && query.trim().length === 0 && (
            <p className="text-xs text-ink-3 px-3 py-6 text-center font-italic-serif">
              検索キーワードを入力してください（⌘K で再度開閉）
            </p>
          )}

          {!isPending && query.trim().length > 0 && (
            <Command.Empty>
              <p className="text-xs text-ink-3 px-3 py-6 text-center">
                該当なし
              </p>
            </Command.Empty>
          )}

          {results.products.length > 0 && (
            <Command.Group heading="商品">
              {results.products.map((p) => (
                <Command.Item
                  key={p.id}
                  value={`product-${p.id}-${p.name}-${p.producer ?? ""}`}
                  onSelect={() =>
                    go(
                      role === "admin"
                        ? `/admin/products/${p.id}/edit`
                        : `/buyer`
                    )
                  }
                  className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-paper-pale"
                >
                  <Wine className="w-4 h-4 text-plate shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-serif truncate">
                      {p.name}
                      {p.vintage && (
                        <span className="text-ink-3 ml-2 plate-num">
                          {p.vintage}
                        </span>
                      )}
                    </p>
                    {(p.producer || p.region) && (
                      <p className="text-xs text-ink-3 truncate">
                        {[p.producer, p.region].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {role === "admin" && results.buyers.length > 0 && (
            <Command.Group heading="飲食店">
              {results.buyers.map((b) => (
                <Command.Item
                  key={b.id}
                  value={`buyer-${b.id}-${b.company_name ?? ""}-${b.customer_code ?? ""}`}
                  onSelect={() => go(`/admin/buyers/${b.id}/edit`)}
                  className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-paper-pale"
                >
                  <Store className="w-4 h-4 text-plate shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-serif truncate">
                      {b.company_name ?? "(未設定)"}
                    </p>
                    {b.customer_code && (
                      <p className="text-xs text-ink-3 plate-num">
                        {b.customer_code}
                      </p>
                    )}
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>

        <div className="border-t border-rule px-3 py-2 flex items-center justify-between text-[10px] text-ink-3 caps">
          <span>↑↓ 移動 / Enter 選択 / Esc 閉じる</span>
          <span>⌘K でいつでも開閉</span>
        </div>
      </Command>
    </div>
  );
}
