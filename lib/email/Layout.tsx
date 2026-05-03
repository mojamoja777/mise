// lib/email/Layout.tsx
// 全メール共通のレイアウト。Mise ブランドカラーを反映。

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

type Props = {
  preview: string;
  title: string;
  children: ReactNode;
};

export function EmailLayout({ preview, title, children }: Props) {
  return (
    <Html lang="ja">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={brand}>
            <Text style={brandText}>🍷 Mise</Text>
          </Section>
          <Heading as="h1" style={h1}>
            {title}
          </Heading>
          <Section style={content}>{children}</Section>
          <Hr style={hr} />
          <Text style={footer}>
            このメールは Mise 受発注管理サービスより自動送信されています。
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  fontFamily:
    "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', system-ui, -apple-system, sans-serif",
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  maxWidth: 560,
  margin: "0 auto",
  padding: "32px 24px",
  backgroundColor: "#ffffff",
};

const brand: React.CSSProperties = {
  paddingBottom: 16,
  borderBottom: "2px solid #6B1A35",
};

const brandText: React.CSSProperties = {
  fontSize: 18,
  fontWeight: "bold",
  color: "#3B0A1E",
  margin: 0,
};

const h1: React.CSSProperties = {
  fontSize: 20,
  fontWeight: "bold",
  color: "#111827",
  marginTop: 24,
  marginBottom: 16,
};

const content: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.7,
  color: "#374151",
};

const hr: React.CSSProperties = {
  borderColor: "#e5e7eb",
  marginTop: 32,
  marginBottom: 16,
};

const footer: React.CSSProperties = {
  fontSize: 12,
  color: "#9ca3af",
  textAlign: "center" as const,
  margin: 0,
};
