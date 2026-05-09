// types/product-delete.ts
// 商品削除関連の型。Server Action ファイル ("use server") から型を export すると
// Next.js 16 のバンドラが「server function as client value」エラーを出すため、
// 共有型はここに置いてクライアント / サーバの両方から import する。

export type DeleteImpact = {
  pendingOrders: Array<{
    orderId: string;
    orderStatus: "pending" | "allocation_pending";
    buyerId: string;
    buyerCompanyName: string | null;
    quantity: number;
    orderedAt: string;
  }>;
};
