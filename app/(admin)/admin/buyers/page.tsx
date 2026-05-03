// app/(admin)/admin/buyers/page.tsx
// 管理者 - 飲食店（buyer）一覧

import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearchKeyword } from "@/lib/auth";
import { BuyerListFilter } from "@/components/admin/BuyerListFilter";

type Props = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

export default async function AdminBuyersPage({ searchParams }: Props) {
  const { q, status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("users")
    .select(
      "id, company_name, customer_code, postal_code, address, phone, is_active, created_at"
    )
    .eq("role", "buyer")
    .order("created_at", { ascending: false });

  // ステータスフィルタ（デフォルトは active のみ）
  const activeFilter = status ?? "active";
  if (activeFilter === "active") {
    query = query.eq("is_active", true);
  } else if (activeFilter === "inactive") {
    query = query.eq("is_active", false);
  }

  // 検索（会社名 or お客様コードの部分一致）
  // PostgREST の or() に渡す前にカンマ・括弧・コロンなどをサニタイズして
  // 構文インジェクションを防ぐ
  if (q && q.trim()) {
    const keyword = sanitizeSearchKeyword(q);
    if (keyword) {
      query = query.or(
        `company_name.ilike.%${keyword}%,customer_code.ilike.%${keyword}%`
      );
    }
  }

  const { data: buyers, error } = await query;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">顧客管理</h1>
        <Link
          href="/admin/buyers/new"
          className="inline-flex items-center gap-1.5 bg-[#6B1A35] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#5a1630] transition-colors"
        >
          <Plus className="w-4 h-4" />
          新規登録
        </Link>
      </div>

      <BuyerListFilter />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
          顧客一覧の取得に失敗しました。
        </div>
      )}

      {buyers && buyers.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  お客様コード
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  会社名
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  電話
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  登録日
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
                  状態
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {buyers.map((buyer) => (
                <tr
                  key={buyer.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-5 py-4 font-mono text-xs text-gray-600">
                    <Link
                      href={`/admin/buyers/${buyer.id}/edit`}
                      className="text-[#6B1A35] hover:underline"
                    >
                      {buyer.customer_code ?? "—"}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-gray-900">
                    <Link
                      href={`/admin/buyers/${buyer.id}/edit`}
                      className="hover:text-[#6B1A35]"
                    >
                      {buyer.company_name}
                    </Link>
                    {buyer.address && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {buyer.address}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-600 text-xs">
                    {buyer.phone ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs">
                    {new Date(buyer.created_at).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {buyer.is_active ? (
                      <span className="inline-block text-[11px] text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                        有効
                      </span>
                    ) : (
                      <span className="inline-block text-[11px] text-gray-500 bg-gray-200 rounded-full px-2 py-0.5">
                        無効
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-20 text-gray-400">
          <Users className="w-10 h-10 mb-3" />
          <p className="text-sm">
            {q || activeFilter !== "active"
              ? "該当する顧客がありません"
              : "顧客がまだ登録されていません"}
          </p>
        </div>
      )}
    </div>
  );
}
