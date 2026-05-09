import Link from "next/link";
import { Button, PlateCorner } from "@/components/ui";

type Props = {
  searchParams: Promise<{
    orderId?: string;
    normal?: string;
    allocation?: string;
  }>;
};

export default async function CompletePage({ searchParams }: Props) {
  const params = await searchParams;
  const normalOrderId = params.normal ?? params.orderId ?? null;
  const allocationOrderId = params.allocation ?? null;
  const hasBoth = !!normalOrderId && !!allocationOrderId;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-10 text-center relative">
      <PlateCorner number="00" />

      <p className="caps mb-3">Plate · Order Confirmed</p>
      <h1 className="font-serif text-5xl tracking-tight">
        <span className="font-italic-serif text-plate">Merci.</span> ご発注を承りました。
      </h1>
      <div className="hairline-gold w-24 my-7" />

      <p className="font-italic-serif text-base text-ink-2 leading-relaxed mb-8 max-w-md">
        {hasBoth
          ? "通常注文と割り当て注文の2件を承りました。"
          : allocationOrderId
            ? "割り当て注文を承りました。"
            : "酒屋が確認次第、準備を開始いたします。"}
      </p>

      <div className="w-full max-w-md space-y-3 mb-8">
        {normalOrderId && (
          <div className="bg-paper border border-rule px-5 py-4 text-left">
            <p className="caps mb-1">通常注文</p>
            <p className="font-mono text-base">#{normalOrderId.slice(0, 8).toUpperCase()}</p>
            <p className="font-italic-serif text-xs text-ink-3 mt-1">
              酒屋が確認次第、準備を開始します
            </p>
          </div>
        )}
        {allocationOrderId && (
          <div className="bg-amber-bg border border-amber px-5 py-4 text-left">
            <p className="caps mb-1 text-amber">割り当て注文</p>
            <p className="font-mono text-base text-amber">
              #{allocationOrderId.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-xs text-ink-2 mt-1 leading-relaxed">
              受付締切後にお店から割り当て本数をご連絡します。
              <span className="font-medium text-ink">キャンセルはできません。</span>
            </p>
          </div>
        )}
      </div>

      <div className="w-full max-w-xs space-y-3">
        <Link href="/buyer" className="block">
          <Button variant="primary" size="lg" className="w-full justify-center">
            続けて発注する
          </Button>
        </Link>
        <Link href="/buyer/orders" className="block">
          <Button variant="default" size="lg" className="w-full justify-center">
            発注履歴を確認
          </Button>
        </Link>
      </div>

      <p className="ornament mt-10" />
    </div>
  );
}
