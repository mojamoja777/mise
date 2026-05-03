// app/(admin)/admin/products/actions.ts
// 商品管理（CRUD）のサーバーアクション
// RLS により admin ロールのみ実行可能

"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

/**
 * 商品登録
 */
export async function createProduct(formData: FormData) {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const values = extractProductValues(formData);
  const error = await validateProductValues(values);
  if (error) return { error };

  const { error: dbError } = await auth.supabase.from("products").insert({
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
  });

  if (dbError) {
    return { error: `登録失敗: ` };
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
    })
    .eq("id", id);

  if (dbError) {
    return { error: "商品の更新に失敗しました。" };
  }

  revalidatePath("/admin/products");
  updateTag("products");
  redirect("/admin/products");
}

/**
 * 商品削除
 */
export async function deleteProduct(id: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const { error } = await auth.supabase.from("products").delete().eq("id", id);

  if (error) {
    return { error: "商品の削除に失敗しました。" };
  }

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

  return {
    name: (formData.get("name") as string).trim(),
    producer: (formData.get("producer") as string).trim(),
    region: (formData.get("region") as string).trim(),
    country: (formData.get("country") as string).trim(),
    category: (formData.get("category") as string).trim(),
    type: (formData.get("type") as string).trim(),
    comment: (formData.get("comment") as string).trim(),
    grape_variety: (formData.get("grape_variety") as string).trim(),
    vintage: vintageRaw ? parseInt(vintageRaw, 10) : null,
    price: priceRaw ? parseFloat(priceRaw) : null,
    stock: stockRaw ? parseInt(stockRaw, 10) : 0,
    image_url: (formData.get("image_url") as string).trim(),
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
