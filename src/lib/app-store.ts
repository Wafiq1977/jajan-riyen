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
/* LOKASI — GPS beneran (Geolocation API) + reverse geocoding,         */
/* dengan fallback pilih area manual.                                  */
/* ------------------------------------------------------------------ */

export const AREAS = [
  "Banaran",
  "Semarang Tengah",
  "Banyumanik",
  "Tembalang",
  "Pedalangan",
  "Gajahmungkur",
  "Candisari",
  "Mijen",
];

export interface UserCoords {
  lat: number;
  lng: number;
}

interface PrefsState {
  area: string;
  coords: UserCoords | null;
  source: "manual" | "gps";
  detectedAt: string | null;
  setLocation: (opts: { area: string; coords: UserCoords | null; source: "manual" | "gps" }) => void;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      area: "Banaran",
      coords: null,
      source: "manual",
      detectedAt: null,
      setLocation: ({ area, coords, source }) =>
        set({ area, coords, source, detectedAt: new Date().toISOString() }),
    }),
    { name: "jajanriyen-prefs" }
  )
);

/** Jarak haversine dua titik (km). */
export function haversineKm(a: UserCoords, b: UserCoords): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

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
