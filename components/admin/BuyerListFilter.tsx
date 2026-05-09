// components/admin/BuyerListFilter.tsx
// 顧客一覧の検索・ステータスフィルタ

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useState, useEffect } from "react";

export function BuyerListFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQ = searchParams.get("q") ?? "";
  const currentStatus = searchParams.get("status") ?? "active";

  const [q, setQ] = useState(currentQ);

  useEffect(() => {
    setQ(currentQ);
  }, [currentQ]);

  const applyFilter = (params: URLSearchParams) => {
    const queryStr = params.toString();
    router.push(queryStr ? `/admin/buyers?${queryStr}` : "/admin/buyers");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");
    applyFilter(params);
  };

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "active") params.delete("status");
    else params.set("status", value);
    applyFilter(params);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 bg-white border border-rule rounded-lg px-3 py-1.5"
      >
        <Search className="w-4 h-4 text-ink-3" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="会社名・お客様コードで検索"
          className="text-sm focus:outline-none w-64"
        />
      </form>
      <select
        value={currentStatus}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="text-sm border border-rule rounded-lg px-3 py-1.5 bg-white"
      >
        <option value="active">有効のみ</option>
        <option value="inactive">無効のみ</option>
        <option value="all">すべて</option>
      </select>
    </div>
  );
}
