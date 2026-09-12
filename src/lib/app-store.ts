"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product, Store, User } from "./types";

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    { name: "jajanriyen-session" }
  )
);

/* ------------------------------------------------------------------ */
/* CART — one UMKM at a time.                                          */
/* A cart holds items from a single store; ordering from another       */
/* store requires clearing it first so transactions never merge.       */
/* ------------------------------------------------------------------ */

export type AddResult = "added" | "replaced" | "conflict";

interface CartState {
  storeId: string | null;
  storeName: string | null;
  items: CartItem[];
  addItem: (product: Product, store: Pick<Store, "id" | "name">, replace?: boolean) => AddResult;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      storeId: null,
      storeName: null,
      items: [],
      addItem: (product, store, replace = false) => {
        const state = get();
        const differentStore = state.storeId !== null && state.storeId !== store.id;
        if (differentStore && !replace) return "conflict";

        const base = differentStore ? [] : state.items;
        const existing = base.find((i) => i.productId === product.id);
        const nextItems = existing
          ? base.map((i) =>
              i.productId === product.id
                ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) }
                : i
            )
          : [
              ...base,
              {
                productId: product.id,
                name: product.name,
                price: product.price,
                originalPrice: product.originalPrice,
                emoji: product.emoji,
                imageUrl: product.imageUrl,
                quantity: Math.min(1, product.stock),
                stock: product.stock,
              },
            ];
        set({ storeId: store.id, storeName: store.name, items: nextItems });
        return differentStore ? "replaced" : "added";
      },
      setQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId
              ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) }
              : i
          ),
        })),
      removeItem: (productId) =>
        set((state) => {
          const items = state.items.filter((i) => i.productId !== productId);
          return items.length === 0
            ? { items, storeId: null, storeName: null }
            : { items };
        }),
      clear: () => set({ storeId: null, storeName: null, items: [] }),
    }),
    { name: "jajanriyen-cart" }
  )
);

export const cartTotalQty = (items: CartItem[]) =>
  items.reduce((sum, i) => sum + i.quantity, 0);

export const cartTotalPrice = (items: CartItem[]) =>
  items.reduce((sum, i) => sum + i.price * i.quantity, 0);
