"use server";
import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireBuyer } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/mailer";
import { OrderReceivedEmail } from "@/lib/email/OrderReceived";
import { getAdminEmails } from "@/lib/email/recipients";
import { appUrl } from "@/lib/url";

type CartItem = {
  productId: string;
  quantity: number;
  price: number;
  name: string;
};

export type CartSyncUpdate = {
  productId: string;
  name: string;
  action: "remove" | "mark_allocation" | "mark_normal";
  reason: string;
};

/**
 * カート同期：最新の商品情報を取得し、無効な商品を弾く・割り当て状態の変化を反映する
 * クライアント側で受け取った結果をもとに localStorage を更新する。
 *
 * 削除済商品（deleted_at IS NOT NULL）が含まれていた場合は archived として返し、
 * 同じ buyer × product への通知は 1 度だけ自動チャットを送信する（dedup 済）。
 */
export async function syncCartAction(productIds: string[]): Promise<{
  products: Array<{
    id: string;
    is_active: boolean;
    is_allocation: boolean;
    allocation_deadline: string | null;
    name: string;
    price: number;
  }>;
  archived: Array<{ id: string; name: string }>;
}> {
  if (productIds.length === 0) return { products: [], archived: [] };

  const supabase = await createClient();

  // active products
  const { data: activeRows } = await supabase
    .from("products")
    .select("id, is_active, is_allocation, allocation_deadline, name, price")
    .in("id", productIds)
    .is("deleted_at", null);

  // archived products (削除済)
  const { data: archivedRows } = await supabase
    .from("products")
    .select("id, name")
    .in("id", productIds)
    .not("deleted_at", "is", null);

  const archived = archivedRows ?? [];

  // archived があれば「初回のみ」自動チャット通知
  if (archived.length > 0) {
    await notifyCartArchived(archived);
  }

  return { products: activeRows ?? [], archived };
}

/**
 * カート内の削除済商品について buyer に自動チャットを送る。
 * dedup テーブル `cart_archive_notifications` の PK 競合で重複通知を防止。
 *
 * service role client を使う理由:
 *   - buyer のセッションでは他テナントの users / chat_messages の RLS が絡んで
 *     admin の id を取れない可能性がある
 *   - dedup テーブルは RLS 全閉のため authenticated 経由では触れない
 */
async function notifyCartArchived(
  archived: Array<{ id: string; name: string }>
): Promise<void> {
  const auth = await requireBuyer();
  if (!auth.ok) return;
  const buyerId = auth.user.id;

  const service = createServiceClient();

  const { data: buyer } = await service
    .from("users")
    .select("tenant_id")
    .eq("id", buyerId)
    .single();
  if (!buyer?.tenant_id) return;

  const { data: admin } = await service
    .from("users")
    .select("id")
    .eq("tenant_id", buyer.tenant_id)
    .eq("role", "admin")
    .limit(1)
    .single();
  if (!admin?.id) return;

  for (const product of archived) {
    // dedup: PK 競合 → 既送 → skip。挿入成功時のみチャット送信。
    const { error: dedupError } = await service
      .from("cart_archive_notifications")
      .insert({ buyer_id: buyerId, product_id: product.id });

    if (dedupError) continue;

    await service.from("chat_messages").insert({
      tenant_id: buyer.tenant_id,
      buyer_id: buyerId,
      sender_id: admin.id,
      sender_role: "admin",
      body: `「${product.name}」は商品登録が削除されたため、カートから自動的に削除されました。`,
    });
  }
}

type CreateOrderResult =
  | {
      error: null;
      normalOrderId: string | null;
      allocationOrderId: string | null;
    }
  | {
      error: string;
      normalOrderId: null;
      allocationOrderId: null;
    };

/**
 * カートから発注を作成する
 * 通常商品と割り当て商品が混在する場合は2件の orders に自動分割する
 * - 通常商品: status='pending', allocated_quantity = quantity（注文時点で確定）
 * - 割り当て商品: status='allocation_pending', allocated_quantity = NULL（決定後にセット）
 */
export async function createOrder(
  items: CartItem[],
  note: string
): Promise<CreateOrderResult> {
  const auth = await requireBuyer();
  if (!auth.ok)
    return {
      error: auth.error,
      normalOrderId: null,
      allocationOrderId: null,
    };
  const supabase = auth.supabase;
  const user = auth.user;

  if (!items.length)
    return {
      error: "カートが空です。",
      normalOrderId: null,
      allocationOrderId: null,
    };

  // 最新の商品情報を取得してサーバー側でも割り当て/通常を判定（カート情報は信頼しない）
  const productIds = items.map((i) => i.productId);
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, is_active, is_allocation, allocation_deadline, price")
    .in("id", productIds)
    .is("deleted_at", null);

  if (productsError || !products) {
    return {
      error: "商品情報の取得に失敗しました。",
      normalOrderId: null,
      allocationOrderId: null,
    };
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  const now = Date.now();

  const normalItems: CartItem[] = [];
  const allocationItems: CartItem[] = [];
  const rejectedNames: string[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product || !product.is_active) {
      rejectedNames.push(item.name);
      continue;
    }
    if (product.is_allocation) {
      if (
        product.allocation_deadline &&
        new Date(product.allocation_deadline).getTime() <= now
      ) {
        rejectedNames.push(item.name);
        continue;
      }
      allocationItems.push(item);
    } else {
      normalItems.push(item);
    }
  }

  if (rejectedNames.length > 0) {
    return {
      error: `次の商品は受付終了または販売停止のため発注できません：${rejectedNames.join("、")}`,
      normalOrderId: null,
      allocationOrderId: null,
    };
  }

  let normalOrderId: string | null = null;
  let allocationOrderId: string | null = null;

  // 通常注文の作成
  if (normalItems.length > 0) {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        note: note || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderError || !order) {
      return {
        error: "通常注文の作成に失敗しました。",
        normalOrderId: null,
        allocationOrderId: null,
      };
    }

    const orderItemsPayload = normalItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.price,
      // 通常商品は注文時点で数量が確定
      allocated_quantity: item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsPayload);

    if (itemsError) {
      // race condition: 注文確定の瞬間に商品が削除された
      const isArchived = itemsError.message?.includes("product is archived");
      return {
        error: isArchived
          ? "注文の途中で取り扱いを終了した商品が含まれていたため、注文できませんでした。カートを更新して再度お試しください。"
          : "通常注文の明細登録に失敗しました。",
        normalOrderId: null,
        allocationOrderId: null,
      };
    }
    normalOrderId = order.id;
  }

  // 割り当て注文の作成
  if (allocationItems.length > 0) {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        note: note || null,
        status: "allocation_pending",
      })
      .select("id")
      .single();

    if (orderError || !order) {
      return {
        error: "割り当て注文の作成に失敗しました。",
        normalOrderId: null,
        allocationOrderId: null,
      };
    }

    const orderItemsPayload = allocationItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.price,
      // 割り当て商品はオーナー決定後にセットする
      allocated_quantity: null,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsPayload);

    if (itemsError) {
      const isArchived = itemsError.message?.includes("product is archived");
      return {
        error: isArchived
          ? "注文の途中で取り扱いを終了した商品が含まれていたため、注文できませんでした。カートを更新して再度お試しください。"
          : "割り当て注文の明細登録に失敗しました。",
        normalOrderId: null,
        allocationOrderId: null,
      };
    }
    allocationOrderId = order.id;
  }

  // admin への新着発注通知メール（失敗しても注文成功は維持）
  await notifyAdminsOfNewOrder(supabase, user.id, {
    note,
    normalOrderId,
    normalItems,
    allocationOrderId,
    allocationItems,
  });

  // 嗜好タグの自動学習：注文した商品の country / region / category / grape_variety / type を
  // users.taste_tags にユニオンで積み増し（最大 30 件で頭打ち）。失敗しても注文成功は維持。
  await learnTasteTags(supabase, user.id, productIds).catch(() => {
    // 学習失敗はログにも残さず、注文体験を妨げない
  });

  return { error: null, normalOrderId, allocationOrderId };
}

/**
 * 注文した商品の特徴 (country / region / category / grape_variety / type) を
 * users.taste_tags にユニオンで追加する。
 *
 * - 既存タグと重複する値はスキップ
 * - 全件で 30 件を超えたら古い順に切り詰め（FIFO）
 * - 短すぎ (< 2 char) や 'その他' / '不明' / null は除外
 */
async function learnTasteTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  productIds: string[]
): Promise<void> {
  if (productIds.length === 0) return;

  const [{ data: products }, { data: me }] = await Promise.all([
    supabase
      .from("products")
      .select("country, region, category, grape_variety, type")
      .in("id", productIds),
    supabase.from("users").select("taste_tags").eq("id", userId).single(),
  ]);

  if (!products || products.length === 0) return;

  // 商品から候補タグを収集（grape_variety はカンマ・読点で split）
  const candidates = new Set<string>();
  for (const p of products) {
    const fields = [p.country, p.region, p.category, p.type];
    for (const f of fields) {
      if (typeof f === "string" && f.length >= 2 && f !== "その他" && f !== "不明") {
        candidates.add(f.trim());
      }
    }
    if (typeof p.grape_variety === "string" && p.grape_variety.length > 0) {
      for (const g of p.grape_variety.split(/[,、]/)) {
        const trimmed = g.trim();
        if (trimmed.length >= 2) candidates.add(trimmed);
      }
    }
  }

  if (candidates.size === 0) return;

  const existing = new Set(
    ((me?.taste_tags ?? []) as string[]).map((t) => t.trim()).filter(Boolean)
  );
  const newTags = Array.from(candidates).filter((t) => !existing.has(t));
  if (newTags.length === 0) return;

  // 既存 + 新規 を最新優先で結合、上限 30 件に切り詰め
  const merged = [...newTags, ...Array.from(existing)].slice(0, 30);

  await supabase.from("users").update({ taste_tags: merged }).eq("id", userId);
}

async function notifyAdminsOfNewOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  buyerId: string,
  args: {
    note: string;
    normalOrderId: string | null;
    normalItems: CartItem[];
    allocationOrderId: string | null;
    allocationItems: CartItem[];
  }
) {
  const { data: profile } = await supabase
    .from("users")
    .select("company_name, tenant_id")
    .eq("id", buyerId)
    .single();
  if (!profile) return;

  const adminEmails = await getAdminEmails(profile.tenant_id);
  if (adminEmails.length === 0) return;

  const subject = (label: string) =>
    `【${label}】${profile.company_name} 様より新規発注`;

  const tasks: Promise<unknown>[] = [];
  if (args.normalOrderId) {
    tasks.push(
      sendNotificationEmail({
        to: adminEmails,
        subject: subject("発注"),
        react: createElement(OrderReceivedEmail, {
          buyerName: profile.company_name,
          orderId: args.normalOrderId,
          isAllocation: false,
          items: args.normalItems.map((i) => ({
            productName: i.name,
            quantity: i.quantity,
          })),
          note: args.note || null,
          adminUrl: appUrl(`/admin/orders/${args.normalOrderId}`),
        }),
      })
    );
  }
  if (args.allocationOrderId) {
    tasks.push(
      sendNotificationEmail({
        to: adminEmails,
        subject: subject("割り当て希望"),
        react: createElement(OrderReceivedEmail, {
          buyerName: profile.company_name,
          orderId: args.allocationOrderId,
          isAllocation: true,
          items: args.allocationItems.map((i) => ({
            productName: i.name,
            quantity: i.quantity,
          })),
          note: args.note || null,
          adminUrl: appUrl(`/admin/orders/${args.allocationOrderId}`),
        }),
      })
    );
  }
  await Promise.all(tasks);
}

export async function cancelOrderByBuyer(orderId: string) {
  const auth = await requireBuyer();
  if (!auth.ok) return { error: auth.error };
  const supabase = auth.supabase;
  const user = auth.user;

  // 自分の注文かつpendingのみキャンセル可能
  const { data: order } = await supabase
    .from("orders")
    .select("status, buyer_id")
    .eq("id", orderId)
    .single();

  if (!order) return { error: "発注が見つかりません。" };
  if (order.buyer_id !== user.id) return { error: "この発注をキャンセルする権限がありません。" };
  if (order.status !== "pending") return { error: "受付中の発注のみキャンセルできます。" };

  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId);

  if (error) return { error: "キャンセルに失敗しました。" };

  revalidatePath("/buyer/orders");
  revalidatePath("/buyer/orders/" + orderId);
}
