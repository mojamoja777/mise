// app/(buyer)/buyer/chat/page.tsx
// 発注者 - admin との単一チャットスレッド

import { requireBuyer } from "@/lib/auth";
import { fetchThreadMessages } from "@/lib/chat";
import { ThreadView } from "@/components/chat/ThreadView";
import { sendBuyerMessage, markBuyerThreadRead } from "./actions";

export default async function BuyerChatPage() {
  const auth = await requireBuyer();
  if (!auth.ok) {
    return (
      <div className="p-8 text-sm text-red-600">{auth.error}</div>
    );
  }

  const messages = await fetchThreadMessages(auth.supabase, auth.user.id);

  // 既読位置を更新
  await markBuyerThreadRead();

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-4rem)]">
      <header className="px-4 py-2 border-b border-gray-200 bg-white shrink-0">
        <h1 className="text-sm font-semibold text-gray-900">お問い合わせ</h1>
        <p className="text-[11px] text-gray-400 mt-0.5">
          酒屋とのやり取りをここで行います。返信には時間がかかる場合があります。
        </p>
      </header>
      <div className="flex-1 min-h-0">
        <ThreadView
          messages={messages.map((m) => ({
            id: m.id,
            body: m.body,
            sender_id: m.sender_id,
            sender_role: m.sender_role,
            created_at: m.created_at,
            edited_at: m.edited_at,
            deleted_at: m.deleted_at,
          }))}
          currentUserId={auth.user.id}
          send={sendBuyerMessage}
          emptyHint="ここから酒屋にメッセージを送れます"
        />
      </div>
    </div>
  );
}
