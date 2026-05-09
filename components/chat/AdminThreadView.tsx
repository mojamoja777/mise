// components/chat/AdminThreadView.tsx
// admin チャットの右ペイン：選択 buyer のメッセージ履歴 + 入力欄

import { ThreadView, type ThreadMessage } from "./ThreadView";

type Buyer = {
  id: string;
  companyName: string;
  customerCode: string | null;
  isActive: boolean;
};

type Props = {
  buyer: Buyer;
  messages: ThreadMessage[];
  currentUserId: string;
  send: (body: string) => Promise<{ error: string | null }>;
};

export function AdminThreadView({ buyer, messages, currentUserId, send }: Props) {
  return (
    <div className="flex-1 flex flex-col bg-paper">
      <header className="px-5 py-4 border-b border-rule shrink-0">
        <p className="caps">Correspondence</p>
        <div className="flex items-baseline gap-3 mt-1">
          <h2 className="font-serif text-2xl tracking-tight">{buyer.companyName}</h2>
          {buyer.customerCode && (
            <span className="caps font-mono">{buyer.customerCode}</span>
          )}
          {!buyer.isActive && <span className="caps text-ink-3">— 無効 —</span>}
        </div>
      </header>
      <div className="flex-1 min-h-0">
        <ThreadView
          buyerId={buyer.id}
          initialMessages={messages}
          currentUserId={currentUserId}
          send={send}
          enableAISuggestions
          emptyHint="まだメッセージはありません。最初の挨拶を送ってみましょう。"
        />
      </div>
    </div>
  );
}
