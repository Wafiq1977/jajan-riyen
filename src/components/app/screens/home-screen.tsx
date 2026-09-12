"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Clock3,
  ChevronRight,
  ShoppingBasket,
  Coffee,
  CakeSlice,
  LayoutGrid,
  Zap,
} from "lucide-react";
import type { Store, User } from "@/lib/types";
import { formatRupiah, maskPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePrefsStore } from "@/lib/app-store";
import { BrandWordmark } from "../brand";
import { TopBar, CountdownChip, AreaButton, BellIconButton, CartIconButton } from "../widgets";
import { ProductThumb, Stars, SectionTitle, EmptyState, DiscountBadge, SkeletonList } from "../shared";

const CATEGORIES = [
  { key: "", label: "Semua", icon: LayoutGrid },
  { key: "Makanan", label: "Makanan", icon: ShoppingBasket },
  { key: "Minuman", label: "Minuman", icon: Coffee },
  { key: "Dessert", label: "Dessert", icon: CakeSlice },
];

export default function HomeScreen({
  user,
  unreadCount,
  onOpenStore,
  onOpenFlashSale,
  onOpenLocation,
  onOpenNotifications,
  onOpenCart,
}: {
  user: User | null;
  unreadCount: number;
  onOpenStore: (storeId: string) => void;
  onOpenFlashSale: () => void;
  onOpenLocation: () => void;
  onOpenNotifications: () => void;
  onOpenCart: () => void;
}) {
  const [stores, setStores] = useState<Store[] | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const area = usePrefsStore((s) => s.area);

  useEffect(() => {
    let alive = true;
    fetch("/api/stores")
      .then((r) => r.json())
      .then((data) => {
        if (alive) setStores(data.stores ?? []);
      })
      .catch(() => alive && setStores([]));
    return () => {
      alive = false;
    };
  }, []);

  const flashProducts = useMemo(() => {
    if (!stores) return [];
    return stores
      .flatMap((s) => s.products.map((p) => ({ product: p, store: s })))
      .filter((x) => x.product.isFlashSale)
      .slice(0, 8);
  }, [stores]);

  const filteredStores = useMemo(() => {
    if (!stores) return [];
    const q = query.trim().toLowerCase();
    return stores.filter((s) => {
      const matchCat = !category || s.category === category;
      const matchQ =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q) ||
        s.products.some((p) => p.name.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
  }, [stores, query, category]);

  return (
    <div>
      {/* Transparent navbar — glassy on scroll */}
      <TopBar>
        {(scrolled) => (
          <>
            <div className="min-w-0">
              <div className={cn("transition-opacity duration-300", scrolled ? "opacity-100" : "opacity-0")}>
                <BrandWordmark size="sm" />
              </div>
              <div
                className={cn(
                  "absolute inset-0 flex items-center px-5 transition-opacity duration-300",
                  scrolled ? "opacity-0 pointer-events-none" : "opacity-100"
                )}
              >
                <span className="text-sm font-extrabold text-white/95">
                  Halo{user ? `, ${maskPhone(user.phone)}` : ""} 👋
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <AreaButton scrolled={scrolled} area={area} onClick={onOpenLocation} />
              <BellIconButton scrolled={scrolled} unread={unreadCount} onClick={onOpenNotifications} />
              <CartIconButton scrolled={scrolled} onClick={onOpenCart} />
            </div>
          </>
        )}
      </TopBar>

      {/* Hero header (under transparent navbar) */}
      <header className="relative bg-brand-gradient px-5 rounded-b-[2rem] overflow-hidden pb-16 pt-20">
        <motion.div
          className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative z-10">
          <h1 className="text-lg font-extrabold text-white">
            Mau jajan apa hari ini? 🤤
          </h1>
          <p className="text-xs text-teal-50/85">Kuliner UMKM sekitar, bayar tunai atau QRIS</p>

          {/* Search */}
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-lg shadow-teal-900/10">
            <Search className="h-[18px] w-[18px] text-teal-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari toko atau produk…"
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
              aria-label="Cari toko atau produk"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Category chips */}
      <div className="no-scrollbar relative -mt-6 z-10 flex gap-2 overflow-x-auto px-5 pb-1">
        {CATEGORIES.map((cat) => {
          const active = category === cat.key;
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={cn(
                "press flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2.5 text-xs font-bold shadow-sm transition-all",
                active
                  ? "border-primary bg-primary text-white shadow-teal-500/30"
                  : "border-teal-100 bg-white text-slate-600 hover:border-teal-300"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Promo banner — clickable → flash sale */}
      <div className="mt-4 px-5">
        <motion.button
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={onOpenFlashSale}
          className="relative block w-full overflow-hidden rounded-3xl text-left card-soft"
          aria-label="Buka Flash Sale Jajan Riyen"
        >
          <img
            src="/banner-promo.png"
            alt="Promo Jajan Riyen diskon hingga 45%"
            className="h-36 w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-teal-900/75 via-teal-800/35 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center px-5">
            <span className="flex w-fit items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-extrabold text-teal-950">
              <Zap className="h-2.5 w-2.5 fill-teal-950" /> FLASH SALE
            </span>
            <h3 className="mt-1.5 text-xl font-extrabold leading-tight text-white drop-shadow">
              Diskon hingga 45% <br /> buat kuliner lokal
            </h3>
            <span className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-emerald-200">
              Lihat semuanya <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </motion.button>
      </div>

      {/* Flash sale rail */}
      {!query && flashProducts.length > 0 && (
        <section className="mt-6">
          <div className="px-5">
            <SectionTitle
              title={
                <span className="flex items-center gap-1.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-red-500 text-white">
                    <Zap className="h-3.5 w-3.5 fill-white" />
                  </span>
                  Flash Sale
                </span>
              }
              subtitle="Harga miring terbatas, buruan!"
              action={<button onClick={onOpenFlashSale} className="press text-[11px] font-extrabold text-primary hover:underline">Lihat Semua</button>}
            />
            <div className="-mt-1 mb-3">
              <CountdownChip label="Berakhir dalam" />
            </div>
          </div>
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-5 pb-2">
            {flashProducts.map(({ product, store }) => (
              <button
                key={product.id}
                onClick={() => onOpenStore(store.id)}
                className="press w-36 shrink-0 overflow-hidden rounded-3xl border border-teal-50 bg-white text-left card-soft"
              >
                <div className="relative">
                  <ProductThumb product={product} className="h-28 w-full" rounded="" />
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-extrabold text-white">
                    <Zap className="h-2.5 w-2.5 fill-white" /> FLASH
                  </span>
                </div>
                <div className="p-3">
                  <p className="truncate text-xs font-bold text-foreground">{product.name}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-sm font-extrabold text-primary">{formatRupiah(product.price)}</span>
                    <DiscountBadge product={product} />
                  </div>
                  <p className="mt-1 truncate text-[10px] text-muted-foreground">📍 {store.name}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Store list */}
      <section className="mt-4 px-5">
        <SectionTitle
          title={query ? `Hasil untuk “${query}”` : "Toko Terdekat"}
          subtitle={stores ? `${filteredStores.length} toko siap melayanimu` : "Memuat…"}
        />
        {!stores ? (
          <SkeletonList count={4} />
        ) : filteredStores.length === 0 ? (
          <EmptyState
            title="Toko tidak ditemukan"
            description="Coba kata kunci lain atau ganti kategorinya ya."
          />
        ) : (
          <div className="space-y-3">
            {filteredStores.map((store, idx) => {
              const cheapest = [...store.products].sort((a, b) => a.price - b.price)[0];
              return (
                <motion.button
                  key={store.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpenStore(store.id)}
                  className="press w-full overflow-hidden rounded-3xl border border-teal-50 bg-white p-3.5 text-left card-soft"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-brand-gradient shadow-md shadow-teal-500/25">
                      {store.logoUrl ? (
                        <img src={store.logoUrl} alt={`Logo ${store.name}`} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-2xl text-white">
                          {store.category === "Minuman" ? "🧋" : store.category === "Dessert" ? "🍰" : "🍛"}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-sm font-extrabold text-foreground">{store.name}</h3>
                        <Stars rating={store.rating} className="shrink-0 text-amber-500" />
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {store.category} · {store.distanceKm.toFixed(1)} km · {store.products.length} produk
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-600">
                          <Clock3 className="h-2.5 w-2.5" /> Buka {store.openTime}–{store.closeTime}
                        </span>
                        {cheapest && (
                          <span className="truncate rounded-full bg-teal-50 px-2 py-0.5 text-[9px] font-bold text-teal-700">
                            Mulai {formatRupiah(cheapest.price)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="mt-4 h-4 w-4 shrink-0 text-slate-300" />
                  </div>
                  {store.products[0] && (
                    <div className="mt-3 flex gap-2 overflow-hidden">
                      {store.products.slice(0, 3).map((p) => (
                        <div key={p.id} className="relative">
                          <ProductThumb product={p} className="h-14 w-14" rounded="rounded-xl" />
                          {p.isFlashSale && (
                            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white">
                              <Zap className="h-2.5 w-2.5 fill-white" />
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </section>

      <footer className="mt-10 pb-2 text-center text-[10px] text-slate-400">
        Jajan Riyen · Marketplace jajan lokal 🌿
      </footer>
    </div>
  );
}
