// lib/email/InvoiceReminder.tsx
// 期限超過の請求書 → 1 クリックで送る督促メール

import { Section, Text, Button } from "@react-email/components";
import { EmailLayout } from "./Layout";

type Props = {
  buyerName: string;
  periodLabel: string;
  totalAmount: number;
  dueDateLabel: string;
  daysOverdue: number;
  invoiceUrl: string;
};

const yen = (n: number) => `¥${n.toLocaleString()}`;

export function InvoiceReminderEmail({
  buyerName,
  periodLabel,
  totalAmount,
  dueDateLabel,
  daysOverdue,
  invoiceUrl,
}: Props) {
  const preview = `${periodLabel} の請求書（${yen(totalAmount)}）お支払いのお願い`;

  return (
    <EmailLayout preview={preview} title="お支払いのご確認のお願い">
      <Text>{buyerName} 様</Text>
      <Text>
        いつもお世話になっております。
        <br />
        標記の請求書につきまして、お支払期限を {daysOverdue} 日経過しておりますが
        ご入金の確認がとれておりません。お振込みお願い申し上げます。
      </Text>

      <Section style={amountBox}>
        <Text style={amountLabel}>ご請求金額（税込）</Text>
        <Text style={amount}>{yen(totalAmount)}</Text>
        <Text style={meta}>
          {periodLabel} 分 · お支払期限: {dueDateLabel}
        </Text>
      </Section>

      <Text>
        既にお振込みいただいている場合は、本メールはご容赦ください。
      </Text>

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

const meta: React.CSSProperties = {
  fontSize: 11,
  color: "#6b7280",
  margin: "8px 0 0",
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
