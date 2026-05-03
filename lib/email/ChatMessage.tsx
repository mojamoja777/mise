// lib/email/ChatMessage.tsx
// チャット新着通知（admin / buyer 両方向）

import { Section, Text, Button } from "@react-email/components";
import { EmailLayout } from "./Layout";

type Props = {
  recipientName: string;
  senderLabel: string;
  body: string;
  threadUrl: string;
};

export function ChatMessageEmail({
  recipientName,
  senderLabel,
  body,
  threadUrl,
}: Props) {
  const preview = `${senderLabel} からメッセージが届いています`;
  // 本文プレビューは120文字まで
  const bodyPreview = body.length > 120 ? body.slice(0, 120) + "…" : body;

  return (
    <EmailLayout preview={preview} title="新しいメッセージが届きました">
      <Text>{recipientName} 様</Text>
      <Text>
        <strong>{senderLabel}</strong> からメッセージが届いています。
      </Text>

      <Section style={quote}>
        <Text style={quoteText}>{bodyPreview}</Text>
      </Section>

      <Button href={threadUrl} style={cta}>
        チャットを開く
      </Button>
    </EmailLayout>
  );
}

const quote: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderLeft: "3px solid #6B1A35",
  padding: "10px 14px",
  borderRadius: 4,
  margin: "16px 0",
};

const quoteText: React.CSSProperties = {
  fontSize: 13,
  color: "#374151",
  margin: 0,
  whiteSpace: "pre-wrap" as const,
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
