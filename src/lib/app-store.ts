"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Order, Product, Store, User } from "./types";

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
/* PREFS — user-selected location area (shown in the top bar).          */
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

interface PrefsState {
  area: string;
  setArea: (area: string) => void;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      area: "Banaran",
      setArea: (area) => set({ area }),
    }),
    { name: "jajanriyen-prefs" }
  )
);

/* ------------------------------------------------------------------ */
/* NOTIFICATIONS — lightweight feed derived from the user's orders.     */
/* ------------------------------------------------------------------ */

export interface NotifItem {
  id: string;
  title: string;
  body: string;
  emoji: string;
  at: string;
  kind: "order" | "promo";
  orderStatus?: string;
}

interface NotifState {
  orders: Order[];
  lastRead: string;
  setOrders: (orders: Order[]) => void;
  markRead: () => void;
}

export const useNotifStore = create<NotifState>()((set) => ({
  orders: [],
  lastRead: new Date(0).toISOString(),
  setOrders: (orders) => set({ orders }),
  markRead: () => set({ lastRead: new Date().toISOString() }),
}));

/** Build a notification feed from the user's orders + always-on promos. */
export function buildNotifications(orders: Order[]): NotifItem[] {
  const promo: NotifItem[] = [
    {
      id: "promo-flash",
      title: "Flash Sale hari ini ⚡",
      body: "Diskon hingga 45% buat kuliner lokal. Berakhir tengah malam!",
      emoji: "⚡",
      at: new Date(new Date().setHours(6, 0, 0, 0)).toISOString(),
      kind: "promo",
    },
    {
      id: "promo-qris",
      title: "Bayar pakai QRIS lebih praktis",
      body: "Scan QRIS penjual langsung dari aplikasi — anti uang pas.",
      emoji: "🔳",
      at: new Date(new Date().setHours(5, 0, 0, 0)).toISOString(),
      kind: "promo",
    },
  ];

  const fromOrders: NotifItem[] = orders.map((o) => {
    const storeName = o.store?.name ?? "Penjual";
    switch (o.status) {
      case "PENDING":
        return {
          id: `order-${o.id}`,
          title: `Pesanan ${o.code} diterima`,
          body: `${storeName} sedang memeriksa pesananmu (${o.quantity} item · Rp${o.totalPrice.toLocaleString("id-ID")}).`,
          emoji: "🧾",
          at: o.createdAt,
          kind: "order",
          orderStatus: o.status,
        };
      case "PROCESSING":
        return {
          id: `order-${o.id}`,
          title: `Pesanan ${o.code} sedang diproses`,
          body: `${storeName} sedang menyiapkan pesananmu. Siapkan barcode saat pengambilan.`,
          emoji: "👨‍🍳",
          at: o.updatedAt ?? o.createdAt,
          kind: "order",
          orderStatus: o.status,
        };
      case "COMPLETED":
        return {
          id: `order-${o.id}`,
          title: `Pesanan ${o.code} selesai`,
          body: `Terima kasih sudah jajan di ${storeName}! Jangan lupa beri rating ya.`,
          emoji: "🎉",
          at: o.updatedAt ?? o.createdAt,
          kind: "order",
          orderStatus: o.status,
        };
      default:
        return {
          id: `order-${o.id}`,
          title: `Pesanan ${o.code} dibatalkan`,
          body: `Pesananmu di ${storeName} dibatalkan.`,
          emoji: "❌",
          at: o.updatedAt ?? o.createdAt,
          kind: "order",
          orderStatus: o.status,
        };
    }
  });

  return [...fromOrders, ...promo].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
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
