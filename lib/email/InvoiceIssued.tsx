// lib/email/InvoiceIssued.tsx
// 月次請求書発行時に buyer に届く通知メール

import { Section, Text, Button } from "@react-email/components";
import { EmailLayout } from "./Layout";

type Props = {
  buyerName: string;
  periodLabel: string;
  totalAmount: number;
  invoiceUrl: string;
};

const yen = (n: number) => `¥${n.toLocaleString()}`;

export function InvoiceIssuedEmail({
  buyerName,
  periodLabel,
  totalAmount,
  invoiceUrl,
}: Props) {
  const preview = `${periodLabel} の請求書（${yen(totalAmount)} 税込）`;

  return (
    <EmailLayout preview={preview} title="月次請求書を発行しました">
      <Text>{buyerName} 様</Text>
      <Text>
        平素よりご利用いただきありがとうございます。
        <br />
        {periodLabel} の請求書を発行いたしました。
      </Text>

      <Section style={amountBox}>
        <Text style={amountLabel}>ご請求金額（税込）</Text>
        <Text style={amount}>{yen(totalAmount)}</Text>
      </Section>

      <Text>明細・PDFは管理画面からご確認いただけます。</Text>

      <Button href={invoiceUrl} style={cta}>
        請求書を表示
      </Button>
    </EmailLayout>
  );
}

const amountBox: React.CSSProperties = {
  backgroundColor: "#FDF4F6",
  borderRadius: 8,
  padding: "16px 20px",
  textAlign: "center" as const,
  margin: "20px 0",
};

const amountLabel: React.CSSProperties = {
  fontSize: 12,
  color: "#6b7280",
  margin: "0 0 4px",
};

const amount: React.CSSProperties = {
  fontSize: 22,
  fontWeight: "bold",
  color: "#3B0A1E",
  margin: 0,
};

const cta: React.CSSProperties = {
  backgroundColor: "#6B1A35",
  color: "#ffffff",
  borderRadius: 8,
  padding: "10px 20px",
  textDecoration: "none",
  fontSize: 14,
  display: "inline-block",
};
