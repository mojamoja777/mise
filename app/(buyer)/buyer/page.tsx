// app/(buyer)/buyer/page.tsx
// 発注者 - 商品一覧ページ

import { getActiveProducts } from "@/lib/products";
import { ProductList } from "@/components/buyer/ProductList";

export default async function BuyerPage() {
  const products = await getActiveProducts();
  return <ProductList products={products} />;
}
