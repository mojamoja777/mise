"use client";

// components/admin/OrderFilter.tsx
// 発注一覧のステータスフィルター

import { useRouter, useSearchParams } from "next/navigation";
import { STATUS_LABEL } from "@/components/admin/StatusBadge";

const OPTIONS = [
  { value: "", label: "すべて" },
  ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
];

export function OrderFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? "";

  function handleChange(value: string) {
    const params = new URLSearchParams();
    if (value) params.set("status", value);
    router.push(`/admin?${params.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={(e) => handleChange(e.target.value)}
      className="border border-rule rounded-lg px-3 py-2 text-sm text-ink-2 focus:outline-none focus:ring-2 focus:ring-plate bg-white"
    >
      {OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
