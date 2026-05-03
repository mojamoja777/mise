"use client";

// lib/cart-context.tsx
// カート状態管理（localStorage に永続化）

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  isAllocation: boolean;
  allocationDeadline: string | null;
};

type AddItemInput = {
  id: string;
  name: string;
  price: number;
  isAllocation?: boolean;
  allocationDeadline?: string | null;
  quantity?: number; // 追加する本数（未指定は1）
};

type CartContextType = {
  items: CartItem[];
  addItem: (product: AddItemInput) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  syncItems: (next: CartItem[]) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  /** localStorage からの復元が完了したか。SSR の 0 → Client の N のちらつき抑制に使う */
  hydrated: boolean;
};

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = "wine-saas-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // localStorage から復元（ハイドレーション後）
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved));
    } catch {
      // 読み込みエラーは無視
    }
    setHydrated(true);
  }, []);

  // items が変わるたびに localStorage に保存
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  // 別タブで更新があった場合に取り込む
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      if (!e.newValue) {
        setItems([]);
        return;
      }
      try {
        const next = JSON.parse(e.newValue);
        if (Array.isArray(next)) setItems(next);
      } catch {
        // 壊れた値は無視
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addItem = useCallback((product: AddItemInput) => {
    const addQty = product.quantity ?? 1;
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + addQty }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: addQty,
          isAllocation: product.isAllocation ?? false,
          allocationDeadline: product.allocationDeadline ?? null,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.productId !== productId));
    } else {
      setItems((prev) =>
        prev.map((item) =>
          item.productId === productId ? { ...item, quantity } : item
        )
      );
    }
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const syncItems = useCallback((next: CartItem[]) => {
    setItems(next);
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        syncItems,
        clearCart,
        totalItems,
        totalPrice,
        hydrated,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
