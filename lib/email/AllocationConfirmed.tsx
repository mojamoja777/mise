// lib/email/AllocationConfirmed.tsx
// admin が割り当てを確定した直後に buyer（飲食店）に届く通知メール

import { Section, Text, Button } from "@react-email/components";
import { EmailLayout } from "./Layout";

type Decision = {
  productName: string;
  requestedQty: number;
  allocatedQty: number;
};

type Props = {
  buyerName: string;
  decisions: Decision[];
  buyerUrl: string;
};

export function AllocationConfirmedEmail({
  buyerName,
  decisions,
  buyerUrl,
}: Props) {
  const total = decisions.reduce((s, d) => s + d.allocatedQty, 0);
  const preview = `${buyerName} 様 / 配分本数 ${total}本のご連絡`;

  return (
    <EmailLayout preview={preview} title="割り当て本数が確定しました">
      <Text>{buyerName} 様</Text>
      <Text>
        ご希望いただいた割り当て対象商品の配分本数が確定しましたのでご連絡いたします。
      </Text>

      <Section style={list}>
        {decisions.map((d, i) => (
          <Section key={i} style={row}>
            <Text style={rowProduct}>{d.productName}</Text>
            <Text style={rowQty}>
              希望 {d.requestedQty}本 → <strong>{d.allocatedQty}本</strong>
            </Text>
          </Section>
        ))}
      </Section>

      <Text style={notice}>
        本件のキャンセルはお受けできません。商品代金は月次請求書に計上いたします。
      </Text>

      <Button href={buyerUrl} style={cta}>
        発注詳細を確認する
      </Button>
    </EmailLayout>
  );
}

const list: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderRadius: 8,
  padding: "12px 16px",
  margin: "16px 0",
};

const row: React.CSSProperties = {
  borderBottom: "1px solid #e5e7eb",
  padding: "8px 0",
};

const rowProduct: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "#111827",
  margin: 0,
};

const rowQty: React.CSSProperties = {
  fontSize: 12,
  color: "#6b7280",
  margin: "2px 0 0",
};

const notice: React.CSSProperties = {
  backgroundColor: "#fffbeb",
  border: "1px solid #fde68a",
  color: "#92400e",
  fontSize: 12,
  padding: "10px 12px",
  borderRadius: 6,
};

const cta: React.CSSProperties = {
  backgroundColor: "#6B1A35",
  color: "#ffffff",
  borderRadius: 8,
  padding: "10px 20px",
  textDecoration: "none",
  fontSize: 14,
  marginTop: 16,
  display: "inline-block",
};
