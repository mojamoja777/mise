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
    <div className="flex-1 flex flex-col">
      <header className="px-5 py-3 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-baseline gap-3">
          <h2 className="text-base font-semibold text-gray-900">
            {buyer.companyName}
          </h2>
          {buyer.customerCode && (
            <span className="text-xs font-mono text-gray-400">
              {buyer.customerCode}
            </span>
          )}
          {!buyer.isActive && (
            <span className="text-[10px] text-gray-500 bg-gray-200 rounded-full px-2 py-0.5">
              無効
            </span>
          )}
        </div>
      </header>
      <div className="flex-1 min-h-0">
        <ThreadView
          buyerId={buyer.id}
          initialMessages={messages}
          currentUserId={currentUserId}
          send={send}
          emptyHint="まだメッセージはありません。最初の挨拶を送ってみましょう。"
        />
      </div>
    </div>
  );
}
