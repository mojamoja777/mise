// lib/email/OrderReceived.tsx
// 飲食店が発注した直後に admin（酒屋）に届く通知メール

import { Section, Text, Button } from "@react-email/components";
import { EmailLayout } from "./Layout";

type Item = {
  productName: string;
  quantity: number;
};

type Props = {
  buyerName: string;
  orderId: string;
  isAllocation: boolean;
  items: Item[];
  note: string | null;
  adminUrl: string;
};

export function OrderReceivedEmail({
  buyerName,
  orderId,
  isAllocation,
  items,
  note,
  adminUrl,
}: Props) {
  const title = isAllocation
    ? "新しい割り当て希望が届きました"
    : "新しい発注が届きました";
  const summary = `${buyerName} 様から ${items.length} 商品 / 合計 ${items.reduce(
    (s, i) => s + i.quantity,
    0
  )}本`;

  return (
    <EmailLayout preview={summary} title={title}>
      <Text>{summary}</Text>
      <Text style={meta}>
        発注番号: #{orderId.slice(0, 8).toUpperCase()}
      </Text>

      <Section style={list}>
        {items.map((it, i) => (
          <Text key={i} style={listItem}>
            ・{it.productName}　{it.quantity}本
          </Text>
        ))}
      </Section>

      {note && (
        <Section style={noteBlock}>
          <Text style={noteLabel}>備考</Text>
          <Text style={noteText}>{note}</Text>
        </Section>
      )}

      {isAllocation && (
        <Text style={amber}>
          割り当て対象商品の希望です。受付期限後に按分してご連絡ください。
        </Text>
      )}

      <Button href={adminUrl} style={cta}>
        管理画面で確認する
      </Button>
    </EmailLayout>
  );
}

const meta: React.CSSProperties = {
  fontSize: 12,
  color: "#6b7280",
  margin: "0 0 16px",
};

const list: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderRadius: 8,
  padding: "12px 16px",
  margin: "12px 0",
};

const listItem: React.CSSProperties = {
  fontSize: 13,
  margin: "4px 0",
};

const noteBlock: React.CSSProperties = {
  marginTop: 16,
};

const noteLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: "bold",
  color: "#6b7280",
  margin: "0 0 4px",
};

const noteText: React.CSSProperties = {
  fontSize: 13,
  color: "#374151",
  margin: 0,
};

const amber: React.CSSProperties = {
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
