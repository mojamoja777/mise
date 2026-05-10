import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { BuyerForm } from "@/components/admin/BuyerForm";
import { BuyerEnrichmentSection } from "@/components/admin/BuyerEnrichmentSection";
import { PlateCorner, Tag } from "@/components/ui";
import type { BuyerProfileEnriched } from "@/types/buyer-enrichment";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditBuyerPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: buyer, error } = await supabase
    .from("users")
    .select(
      "id, role, company_name, customer_code, postal_code, address, phone, is_active, tier, taste_tags, internal_note, hp_url, instagram_url, gmaps_url, profile_enriched, profile_enriched_at",
    )
    .eq("id", id)
    .eq("role", "buyer")
    .single();

  if (error || !buyer) notFound();

  const serviceClient = createServiceClient();
  const { data: authUser } = await serviceClient.auth.admin.getUserById(id);
  const email = authUser?.user?.email ?? "";

  return (
    <div className="px-10 pt-7 pb-10 max-w-4xl relative">
      <PlateCorner number="07" />

      <Link href="/admin/buyers" className="caps inline-flex items-center gap-1 text-ink-3 hover:text-plate mb-4">
        <ChevronLeft className="w-3.5 h-3.5" />
        顧客台帳に戻る
      </Link>

      <header className="border-b border-rule pb-5 mb-7 flex items-start justify-between">
        <div>
          <p className="caps">Buyer · Edit</p>
          <h1 className="font-serif text-4xl mt-2 tracking-tight">{buyer.company_name}</h1>
          <p className="font-italic-serif text-sm mt-1 text-ink-3">顧客情報の編集</p>
        </div>
        {!buyer.is_active && <Tag>無効化済み</Tag>}
      </header>

      <BuyerForm
        mode="edit"
        initial={{
          id: buyer.id,
          email,
          company_name: buyer.company_name,
          customer_code: buyer.customer_code,
          postal_code: buyer.postal_code,
          address: buyer.address,
          phone: buyer.phone,
          is_active: buyer.is_active,
          tier: buyer.tier,
          taste_tags: buyer.taste_tags,
          internal_note: buyer.internal_note,
        }}
      />

      {/* 店舗情報の自動取込（Phase 1: HP のみ） */}
      <div className="card-float p-6 mt-6">
        <BuyerEnrichmentSection
          buyerId={buyer.id}
          initialHpUrl={buyer.hp_url ?? null}
          initialInstagramUrl={buyer.instagram_url ?? null}
          initialGmapsUrl={buyer.gmaps_url ?? null}
          initialEnriched={
            (buyer.profile_enriched as BuyerProfileEnriched | null) ?? null
          }
          initialEnrichedAt={buyer.profile_enriched_at ?? null}
        />
      </div>

      <p className="ornament mt-10" />
    </div>
  );
}
