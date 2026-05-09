// lib/storage/product-images.ts
// 商品画像（Supabase Storage `product-images` バケット）の操作ヘルパ。
// 必ず Server Action / Route Handler 内で呼び出すこと（Supabase クライアントの cookies に依存）。

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const BUCKET = "product-images";

export type ImageRole = "main" | "back" | "japanese" | "other";

/**
 * Storage に 1 枚アップロードして public URL を返す。
 * DB レコード（product_images）への INSERT は呼び出し側が行う。
 */
export async function uploadProductImage(
  supabase: SupabaseClient<Database>,
  productId: string,
  file: File,
  imageRole: ImageRole
): Promise<{ path: string; url: string }> {
  const timestamp = Date.now();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  const path = `products/${productId}/${imageRole}_${timestamp}.${safeExt}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });

  if (error) {
    throw new Error(`画像アップロード失敗: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

/**
 * 1 枚分の画像を DB + Storage の両方から削除する。
 */
export async function deleteProductImage(
  supabase: SupabaseClient<Database>,
  imageId: string
): Promise<void> {
  const { data: image, error: fetchError } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("id", imageId)
    .single();

  if (fetchError || !image) {
    throw new Error("画像が見つかりません");
  }

  // Storage 物理削除（失敗しても DB 削除は続行する）
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([image.storage_path]);
  if (storageError) {
    console.error("[product-images] storage remove failed:", storageError);
  }

  const { error: deleteError } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId);

  if (deleteError) {
    throw new Error(`画像レコードの削除に失敗しました: ${deleteError.message}`);
  }
}

/**
 * 商品削除時に紐づく全画像を Storage から物理削除する。
 * DB レコードは ON DELETE CASCADE で自動削除されるが、Storage は明示削除が必要。
 */
export async function deleteAllProductImagesFromStorage(
  supabase: SupabaseClient<Database>,
  productId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", productId);

  if (error) {
    console.error("[product-images] fetch for bulk delete failed:", error);
    return;
  }
  if (!data || data.length === 0) return;

  const paths = data.map((row) => row.storage_path);
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove(paths);
  if (storageError) {
    console.error("[product-images] bulk storage remove failed:", storageError);
  }
}

/**
 * メイン画像を切り替える。
 * 同一商品内のメインを一旦すべて false にしてから対象 1 枚を true に。
 */
export async function setMainImage(
  supabase: SupabaseClient<Database>,
  productId: string,
  imageId: string
): Promise<void> {
  const { error: clearError } = await supabase
    .from("product_images")
    .update({ is_main: false })
    .eq("product_id", productId);

  if (clearError) {
    throw new Error(`メイン画像のクリアに失敗: ${clearError.message}`);
  }

  const { error: setError } = await supabase
    .from("product_images")
    .update({ is_main: true })
    .eq("id", imageId)
    .eq("product_id", productId);

  if (setError) {
    throw new Error(`メイン画像の設定に失敗: ${setError.message}`);
  }
}
