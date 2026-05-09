import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearchKeyword } from "@/lib/auth";
import { BuyerListFilter } from "@/components/admin/BuyerListFilter";
import { PlateCorner, Tag, Button, Emblem } from "@/components/ui";

type Props = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

export default async function AdminBuyersPage({ searchParams }: Props) {
  const { q, status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("users")
    .select(
      "id, company_name, customer_code, postal_code, address, phone, is_active, created_at",
    )
    .eq("role", "buyer")
    .order("created_at", { ascending: false });

  const activeFilter = status ?? "active";
  if (activeFilter === "active") {
    query = query.eq("is_active", true);
  } else if (activeFilter === "inactive") {
    query = query.eq("is_active", false);
  }

  if (q && q.trim()) {
    const keyword = sanitizeSearchKeyword(q);
    if (keyword) {
      query = query.or(`company_name.ilike.%${keyword}%,customer_code.ilike.%${keyword}%`);
    }
  }

  const { data: buyers, error } = await query;

  return (
    <div className="px-10 pt-7 pb-10 relative">
      <PlateCorner number="07" />

      <header className="border-b border-rule pb-5 mb-7 flex items-baseline justify-between">
        <div>
          <p className="caps">Plate VII · Buyers</p>
          <h1 className="font-serif text-5xl mt-2 tracking-tight">顧客台帳</h1>
          <p className="font-italic-serif text-base mt-2 text-ink-3">取引のある飲食店</p>
        </div>
        <Link href="/admin/buyers/new">
          <Button variant="primary" size="lg">
            <Plus className="w-4 h-4" />
            新規登録
          </Button>
        </Link>
      </header>

      <BuyerListFilter />

      {error && (
        <div className="bg-crimson-bg border border-crimson text-crimson text-sm px-4 py-3 mb-4 mt-4">
          顧客一覧の取得に失敗しました。
        </div>
      )}

      {buyers && buyers.length > 0 ? (
        <table className="w-full text-sm mt-5">
          <thead>
            <tr className="border-b border-plate">
              <th className="text-left py-3 caps w-32">コード</th>
              <th className="text-left py-3 caps">会社名</th>
              <th className="text-left py-3 caps w-40">電話</th>
              <th className="text-left py-3 caps w-32">登録日</th>
              <th className="text-center py-3 caps w-20">状態</th>
            </tr>
          </thead>
          <tbody>
            {buyers.map((buyer) => (
              <tr key={buyer.id} className="border-b border-rule hover:bg-paper-2 transition-colors">
                <td className="py-3.5 font-mono text-xs">
                  <Link href={`/admin/buyers/${buyer.id}/edit`} className="text-plate hover:underline">
                    {buyer.customer_code ?? "—"}
                  </Link>
                </td>
                <td className="py-3.5">
                  <Link href={`/admin/buyers/${buyer.id}/edit`} className="flex items-center gap-3 hover:text-plate">
                    <Emblem size={28}>{buyer.company_name.slice(0, 1)}</Emblem>
                    <div>
                      <p className="font-serif tracking-tight">{buyer.company_name}</p>
                      {buyer.address && (
                        <p className="font-italic-serif text-xs text-ink-3 mt-0.5">{buyer.address}</p>
                      )}
                    </div>
                  </Link>
                </td>
                <td className="text-ink-2 text-xs plate-num">{buyer.phone ?? "—"}</td>
                <td className="text-ink-3 text-xs plate-num">
                  {new Date(buyer.created_at).toLocaleDateString("ja-JP")}
                </td>
                <td className="text-center">
                  {buyer.is_active ? <Tag variant="forest">有効</Tag> : <Tag variant="default">無効</Tag>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="bg-paper-2 border border-rule flex flex-col items-center justify-center py-20 text-ink-3 mt-5">
          <Users className="w-10 h-10 mb-3" />
          <p className="font-italic-serif text-base">
            {q || activeFilter !== "active"
              ? "該当する顧客がありません"
              : "顧客がまだ登録されていません"}
          </p>
        </div>
      )}

      <p className="ornament mt-10" />
    </div>
  );
}
