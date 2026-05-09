// app/(admin)/admin/products/actions.ts
// 商品管理（CRUD）のサーバーアクション
// RLS により admin ロールのみ実行可能

"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { requireAdmin } from "@/lib/auth";
import {
  uploadProductImage,
  deleteProductImage as deleteProductImageStorage,
  setMainImage as setMainImageStorage,
  deleteAllProductImagesFromStorage,
  type ImageRole,
} from "@/lib/storage/product-images";
import type { DeleteImpact } from "@/types/product-delete";

type ProductStatus = "draft" | "published";

const IMAGE_ROLES: ImageRole[] = ["main", "back", "japanese"];

/**
 * 商品登録
 */
export async function createProduct(formData: FormData) {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const values = extractProductValues(formData);
  const error = await validateProductValues(values);
  if (error) return { error };

  const status = parseStatus(formData);
  const images = extractImageFiles(formData);

  // 1. products に INSERT して id を確保（image_url はあとで更新）
  const { data: inserted, error: insertError } = await auth.supabase
    .from("products")
    .insert({
      name: values.name,
      producer: values.producer || null,
      region: values.region || null,
      grape_variety: values.grape_variety || null,
      vintage: values.vintage,
      price: values.price!,
      stock: values.stock,
      image_url: values.image_url || null,
      is_active: values.is_active,
      country: values.country || null,
      comment: values.comment || null,
      category: values.category || null,
      type: values.type || null,
      is_allocation: values.is_allocation,
      allocation_deadline: values.allocation_deadline,
      tax_class: values.tax_class,
      status,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { error: "登録に失敗しました。" };
  }

  // 2. 画像を Storage にアップロード → product_images に INSERT（1 枚目をメイン）
  if (images.length > 0) {
    const mainUrl = await persistProductImages(
      auth.supabase,
      inserted.id,
      images
    );
    // 互換のため products.image_url にもメイン画像 URL を反映
    if (mainUrl) {
      await auth.supabase
        .from("products")
        .update({ image_url: mainUrl })
        .eq("id", inserted.id);
    }
  }

  revalidatePath("/admin/products");
  updateTag("products");
  redirect("/admin/products");
}

/**
 * 商品更新
 */
export async function updateProduct(id: string, formData: FormData) {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const values = extractProductValues(formData);
  const error = await validateProductValues(values);
  if (error) return { error };

  const status = parseStatus(formData);
  const newImages = extractImageFiles(formData);

  const { error: dbError } = await auth.supabase
    .from("products")
    .update({
      name: values.name,
      producer: values.producer || null,
      region: values.region || null,
      grape_variety: values.grape_variety || null,
      vintage: values.vintage,
      price: values.price!,
      stock: values.stock,
      image_url: values.image_url || null,
      is_active: values.is_active,
      country: values.country || null,
      comment: values.comment || null,
      category: values.category || null,
      type: values.type || null,
      is_allocation: values.is_allocation,
      allocation_deadline: values.allocation_deadline,
      tax_class: values.tax_class,
      status,
    })
    .eq("id", id);

  if (dbError) {
    return { error: "商品の更新に失敗しました。" };
  }

  if (newImages.length > 0) {
    const mainUrl = await persistProductImages(auth.supabase, id, newImages);
    // 既存メインが無ければ products.image_url も更新
    if (mainUrl) {
      const { data: current } = await auth.supabase
        .from("products")
        .select("image_url")
        .eq("id", id)
        .single();
      if (!current?.image_url) {
        await auth.supabase
          .from("products")
          .update({ image_url: mainUrl })
          .eq("id", id);
      }
    }
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}/edit`);
  updateTag("products");
  redirect("/admin/products");
}

/**
 * 商品削除前のインパクト確認
 *
 * 確定前の注文（pending / allocation_pending）の店舗一覧を返す。
 * UI 側はこれを使って admin に「先に連絡してね」アラートを出す。
 */
export async function getProductDeleteImpact(
  productId: string
): Promise<{ ok: true; impact: DeleteImpact } | { ok: false; error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  // Step 1: order_items + orders を取得（users embed は RLS / 多重 FK で詰まりやすいので分離）
  type ItemRow = {
    quantity: number;
    order_id: string;
    orders: {
      status: "pending" | "allocation_pending";
      ordered_at: string;
      buyer_id: string;
    } | null;
  };

  const { data: itemRows, error: itemsError } = await auth.supabase
    .from("order_items")
    .select(
      `
      quantity,
      order_id,
      orders!inner (
        status,
        ordered_at,
        buyer_id
      )
    `
    )
    .eq("product_id", productId)
    .in("orders.status", ["pending", "allocation_pending"]);

  if (itemsError) {
    return { ok: false, error: "注文情報の取得に失敗しました。" };
  }

  const items = ((itemRows ?? []) as unknown as ItemRow[]).filter(
    (r): r is ItemRow & { orders: NonNullable<ItemRow["orders"]> } =>
      r.orders !== null
  );

  if (items.length === 0) {
    return { ok: true, impact: { pendingOrders: [] } };
  }

  // Step 2: 関係する buyer_id をまとめて users から取得
  const buyerIds = Array.from(new Set(items.map((r) => r.orders.buyer_id)));
  const { data: buyers, error: buyersError } = await auth.supabase
    .from("users")
    .select("id, company_name")
    .in("id", buyerIds);

  if (buyersError) {
    return { ok: false, error: "店舗情報の取得に失敗しました。" };
  }

  const buyerMap = new Map(
    (buyers ?? []).map((b) => [b.id, b.company_name ?? null])
  );

  const pendingOrders: DeleteImpact["pendingOrders"] = items.map((r) => ({
    orderId: r.order_id,
    orderStatus: r.orders.status,
    buyerId: r.orders.buyer_id,
    buyerCompanyName: buyerMap.get(r.orders.buyer_id) ?? null,
    quantity: r.quantity,
    orderedAt: r.orders.ordered_at,
  }));

  return { ok: true, impact: { pendingOrders } };
}

/**
 * 商品削除（常にソフト削除）
 *
 * 全削除をソフト削除に統一する理由:
 *   1. 注文履歴の有無に関わらず、後から「やっぱり戻したい」「AI 抽出をやり直したくない」が起きる
 *   2. クライアント state のカートに入っていた buyer への自動チャット通知が機能する
 *      （ハード削除すると `cart_archive_notifications` の FK CASCADE で dedup レコードも消え、
 *        archived 商品もテーブルから消滅 → 通知不可）
 *   3. アーカイブビューから復元できる UX が一貫する
 *
 * race protection: order_items への BEFORE INSERT トリガーで
 * deleted_at IS NOT NULL を弾くので、ソフト削除コミット後の架空注文は不可能。
 *
 * 物理削除（Storage 含む）が必要になったら、将来的に「アーカイブ N 日経過後の cron 削除」
 * もしくは admin 限定の「完全削除」ボタンで対応する（future-improvements）。
 */
export async function deleteProduct(
  id: string
): Promise<
  | { ok: true; mode: "soft" }
  | { ok: false; error: string }
> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const { error } = await auth.supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "アーカイブに失敗しました。" };
  }

  revalidatePath("/admin/products");
  updateTag("products");
  return { ok: true, mode: "soft" };
}

/**
 * ソフト削除した商品を復元する。
 * - products.deleted_at を NULL に戻す
 * - cart_archive_notifications の dedup レコードも消す（再削除時に再通知できるようにする）
 *
 * AI ラベル抽出のトークン節約のため、誤削除や撤回で「同じ商品を再登録したくない」時に使う。
 */
export async function restoreProduct(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const { error } = await auth.supabase
    .from("products")
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "商品の復元に失敗しました。" };
  }

  // dedup を消去（次に削除した時に buyer 全員に再通知させる）
  await auth.supabase
    .from("cart_archive_notifications")
    .delete()
    .eq("product_id", id);

  revalidatePath("/admin/products");
  updateTag("products");
  return { ok: true };
}

/**
 * 商品画像の削除（編集画面用）
 */
export async function deleteProductImage(productId: string, imageId: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  try {
    await deleteProductImageStorage(auth.supabase, imageId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "削除に失敗しました。" };
  }

  // メイン画像が削除された場合、残った画像のうち最古のものをメインに昇格
  const { data: remaining } = await auth.supabase
    .from("product_images")
    .select("id, is_main, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });

  if (remaining && remaining.length > 0 && !remaining.some((r) => r.is_main)) {
    await auth.supabase
      .from("product_images")
      .update({ is_main: true })
      .eq("id", remaining[0].id);
    // products.image_url 同期
    const { data: nextMain } = await auth.supabase
      .from("product_images")
      .select("storage_url")
      .eq("id", remaining[0].id)
      .single();
    if (nextMain) {
      await auth.supabase
        .from("products")
        .update({ image_url: nextMain.storage_url })
        .eq("id", productId);
    }
  } else if (!remaining || remaining.length === 0) {
    // 残り 0 枚なら image_url もクリア
    await auth.supabase
      .from("products")
      .update({ image_url: null })
      .eq("id", productId);
  }

  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/admin/products");
  updateTag("products");
}

/**
 * メイン画像の切り替え（編集画面用）
 */
export async function setProductMainImage(
  productId: string,
  imageId: string
) {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  try {
    await setMainImageStorage(auth.supabase, productId, imageId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "切り替えに失敗しました。" };
  }

  // products.image_url を新しいメインに同期
  const { data: image } = await auth.supabase
    .from("product_images")
    .select("storage_url")
    .eq("id", imageId)
    .single();
  if (image) {
    await auth.supabase
      .from("products")
      .update({ image_url: image.storage_url })
      .eq("id", productId);
  }

  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/admin/products");
  updateTag("products");
}

// ──────────────────────────────────────────────
// 内部ユーティリティ
// ──────────────────────────────────────────────

type ProductValues = {
  name: string;
  producer: string;
  region: string;
  grape_variety: string;
  vintage: number | null;
  price: number | null;
  stock: number;
  image_url: string;
  is_active: boolean;
  country: string;
  comment: string;
  category: string;
  type: string;
  is_allocation: boolean;
  allocation_deadline: string | null;
  tax_class: "standard" | "reduced" | "exempt";
};

function extractProductValues(formData: FormData): ProductValues {
  const vintageRaw = formData.get("vintage") as string;
  const priceRaw = formData.get("price") as string;
  const stockRaw = formData.get("stock") as string;
  const deadlineRaw = formData.get("allocation_deadline") as string | null;
  const isAllocation = formData.get("is_allocation") === "true";
  const taxClassRaw = (formData.get("tax_class") as string) || "standard";
  const taxClass: ProductValues["tax_class"] =
    taxClassRaw === "reduced" || taxClassRaw === "exempt"
      ? taxClassRaw
      : "standard";

  // datetime-local のローカル時刻を ISO に変換
  const allocationDeadline =
    isAllocation && deadlineRaw ? new Date(deadlineRaw).toISOString() : null;

  // formData.get は input が render されていないと null を返す
  // （カテゴリによって country / region 等が条件 render されるため）
  // .trim() で null 落ちしないよう包む
  const str = (key: string): string => {
    const v = formData.get(key);
    return typeof v === "string" ? v.trim() : "";
  };

  return {
    name: str("name"),
    producer: str("producer"),
    region: str("region"),
    country: str("country"),
    category: str("category"),
    type: str("type"),
    comment: str("comment"),
    grape_variety: str("grape_variety"),
    vintage: vintageRaw ? parseInt(vintageRaw, 10) : null,
    price: priceRaw ? parseFloat(priceRaw) : null,
    stock: stockRaw ? parseInt(stockRaw, 10) : 0,
    image_url: str("image_url"),
    is_active: formData.get("is_active") === "true",
    is_allocation: isAllocation,
    allocation_deadline: allocationDeadline,
    tax_class: taxClass,
  };
}

async function validateProductValues(values: ProductValues): Promise<string | null> {
  if (!values.name) return "商品名は必須です。";
  if (values.price === null || isNaN(values.price) || values.price < 0) {
    return "価格は0以上の数値で入力してください。";
  }
  if (isNaN(values.stock) || values.stock < 0) {
    return "在庫数は0以上の整数で入力してください。";
  }
  if (values.is_allocation && !values.allocation_deadline) {
    return "割り当て対象商品は受付締切日時が必須です。";
  }
  return null;
}

function parseStatus(formData: FormData): ProductStatus {
  const raw = formData.get("status");
  return raw === "published" ? "published" : "draft";
}

function extractImageFiles(formData: FormData): File[] {
  return formData
    .getAll("images")
    .filter((v): v is File => v instanceof File && v.size > 0)
    .slice(0, 3);
}

/**
 * 画像群を Storage にアップロードして product_images に INSERT する。
 * 既存のメイン画像が無い場合のみ最初の画像をメインに設定する。
 * 戻り値はメインに設定された画像の public URL（products.image_url 同期用）。
 */
async function persistProductImages(
  supabase: SupabaseClient<Database>,
  productId: string,
  files: File[]
): Promise<string | null> {
  // 既存メインの有無を先に確認
  const { data: existingMain } = await supabase
    .from("product_images")
    .select("id")
    .eq("product_id", productId)
    .eq("is_main", true)
    .maybeSingle();

  let newMainUrl: string | null = null;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const role: ImageRole = IMAGE_ROLES[i] ?? "other";
    const { path, url } = await uploadProductImage(
      supabase,
      productId,
      file,
      role
    );

    const isMain = !existingMain && i === 0;
    if (isMain) newMainUrl = url;

    const { error: insertError } = await supabase
      .from("product_images")
      .insert({
        product_id: productId,
        storage_path: path,
        storage_url: url,
        image_role: role,
        is_main: isMain,
        display_order: i,
        file_size: file.size,
      });

    if (insertError) {
      // DB INSERT 失敗時は Storage 側の孤児を掃除
      await supabase.storage.from("product-images").remove([path]);
      throw new Error(`画像 DB レコード作成に失敗: ${insertError.message}`);
    }
  }

  return newMainUrl;
}
