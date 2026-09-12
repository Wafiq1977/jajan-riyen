"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, ChevronRight, Zap, LayoutGrid, Percent, TrendingUp, Navigation } from "lucide-react";
import type { Store } from "@/lib/types";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TopBar } from "../widgets";
import { Stars, EmptyState, SkeletonList } from "../shared";

const CIRCLES = [
  { key: "", label: "Semua", emoji: "🧭", bg: "bg-teal-50" },
  { key: "Makanan", label: "Makanan", emoji: "🍛", bg: "bg-orange-50" },
  { key: "Minuman", label: "Minuman", emoji: "🧋", bg: "bg-amber-50" },
  { key: "Dessert", label: "Dessert", emoji: "🍰", bg: "bg-pink-50" },
  { key: "flash", label: "Promo", emoji: "⚡", bg: "bg-red-50" },
];

type QuickFilter = "" | "near" | "hot" | "discount";

const QUICK: { key: QuickFilter; label: string; sub: string; grad: string; icon: React.ReactNode }[] = [
  {
    key: "discount",
    label: "Diskon Besar",
    sub: "Buruan serbu",
    grad: "from-red-500 to-rose-600",
    icon: <Percent className="h-5 w-5" />,
  },
  {
    key: "hot",
    label: "Paling Dicari",
    sub: "Viral minggu ini",
    grad: "from-amber-500 to-orange-600",
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    key: "near",
    label: "Paling Dekat",
    sub: "Di sekitarmu",
    grad: "from-teal-500 to-emerald-600",
    icon: <Navigation className="h-5 w-5" />,
  },
];

export default function ExploreScreen({
  onOpenStore,
  onOpenFlashSale,
}: {
  onOpenStore: (storeId: string) => void;
  onOpenFlashSale: () => void;
}) {
  const [stores, setStores] = useState<Store[] | null>(null);
  const [query, setQuery] = useState("");
  const [circle, setCircle] = useState("");
  const [quick, setQuick] = useState<QuickFilter>("");

  useEffect(() => {
    let alive = true;
    fetch("/api/stores")
      .then((r) => r.json())
      .then((data) => alive && setStores(data.stores ?? []))
      .catch(() => alive && setStores([]));
    return () => {
      alive = false;
    };
  }, []);

  const results = useMemo(() => {
    if (!stores) return [];
    const q = query.trim().toLowerCase();
    let list = stores.filter((s) => {
      const matchCircle =
        !circle ||
        circle === "flash" ||
        s.category === circle ||
        s.products.some((p) => p.category === circle);
      const matchQ =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q) ||
        s.products.some((p) => p.name.toLowerCase().includes(q));
      return matchCircle && matchQ;
    });
    if (quick === "near") list = [...list].sort((a, b) => a.distanceKm - b.distanceKm);
    if (quick === "hot")
      list = [...list].sort(
        (a, b) =>
          b.products.reduce((s, p) => s + p.sold, 0) - a.products.reduce((s, p) => s + p.sold, 0)
      );
    if (quick === "discount") {
      const disc = (s: Store) =>
        s.products.reduce(
          (max, p) => Math.max(max, p.originalPrice ? (p.originalPrice - p.price) / p.originalPrice : 0),
          0
        );
      list = [...list].filter((s) => disc(s) > 0).sort((a, b) => disc(b) - disc(a));
    }
    return list;
  }, [stores, query, circle, quick]);

  const pickCircle = (key: string) => {
    setCircle(key);
    setQuick("");
    if (key === "flash") onOpenFlashSale();
  };

  return (
    <div>
      <TopBar>
        {(scrolled) => (
          <>
            <div className="relative min-w-0">
              <span
                className={cn(
                  "text-[19px] font-black tracking-tight transition-colors duration-300",
                  scrolled ? "text-foreground" : "text-white"
                )}
              >
                Jelajahi
              </span>
              <span
                className={cn(
                  "absolute -bottom-0.5 left-0 h-1 w-8 rounded-full bg-emerald-400 transition-opacity duration-300",
                  scrolled ? "opacity-100" : "opacity-90"
                )}
              />
            </div>
            <button
              className={cn(
                "press flex h-9 items-center gap-1 rounded-full px-3 text-xs font-bold backdrop-blur transition-colors",
                scrolled ? "bg-teal-50 text-primary" : "bg-white/15 text-white"
              )}
            >
              <MapPin className="h-3.5 w-3.5" />
              Banaran ▾
            </button>
          </>
        )}
      </TopBar>

      {/* Search hero */}
      <div className="relative bg-brand-gradient px-5 rounded-b-[2rem] pb-16 pt-20 overflow-hidden">
        <motion.div
          className="absolute -left-10 -bottom-16 h-44 w-44 rounded-full bg-white/10"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative z-10 flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-lg shadow-teal-900/10">
          <Search className="h-[18px] w-[18px] shrink-0 text-teal-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari UMKM, makanan, minuman…"
            className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
            aria-label="Cari di Jelajahi"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-xs font-bold text-slate-400">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category circles */}
      <div className="no-scrollbar relative z-10 -mt-10 flex gap-4 overflow-x-auto px-5 pb-1">
        {CIRCLES.map((c) => {
          const active = circle === c.key;
          return (
            <button
              key={c.key}
              onClick={() => pickCircle(c.key)}
              className="press flex w-[68px] shrink-0 flex-col items-center gap-1.5"
              aria-pressed={active}
            >
              <span
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-full text-2xl shadow-md transition-all",
                  c.bg,
                  active
                    ? "ring-[3px] ring-primary ring-offset-2 scale-105"
                    : "ring-1 ring-teal-100/80"
                )}
              >
                {c.emoji}
              </span>
              <span
                className={cn(
                  "text-center text-[10px] font-bold leading-tight",
                  active ? "text-primary" : "text-slate-600"
                )}
              >
                {c.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pilihan JR — gradient cards */}
      <section className="mt-6">
        <div className="px-5">
          <h2 className="text-[17px] font-extrabold tracking-tight">Pilihan JajanRiyen</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Kurasi terbaik buat perutmu</p>
        </div>
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
          {QUICK.map((qItem) => {
            const active = quick === qItem.key;
            return (
              <motion.button
                key={qItem.key}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setQuick(active ? "" : qItem.key);
                  setCircle("");
                }}
                className={cn(
                  "press relative flex h-36 w-[124px] shrink-0 flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br p-3.5 text-left shadow-lg transition-all",
                  qItem.grad,
                  active ? "ring-[3px] ring-foreground/70 ring-offset-2" : ""
                )}
                aria-pressed={active}
              >
                <span className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/15" />
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur">
                  {qItem.icon}
                </span>
                <span>
                  <span className="block text-[13px] font-extrabold leading-tight text-white">
                    {qItem.label}
                  </span>
                  <span className="mt-1 flex items-center gap-0.5 text-[10px] font-semibold text-white/85">
                    {qItem.sub} <ChevronRight className="h-3 w-3" />
                  </span>
                </span>
              </motion.button>
            );
          })}
          {/* Flash sale card */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onOpenFlashSale}
            className="press relative flex h-36 w-[124px] shrink-0 flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-teal-950 p-3.5 text-left shadow-lg"
          >
            <span className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-400/25" />
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-teal-950">
              <Zap className="h-5 w-5 fill-teal-950" />
            </span>
            <span>
              <span className="block text-[13px] font-extrabold leading-tight text-white">Flash Sale</span>
              <span className="mt-1 flex items-center gap-0.5 text-[10px] font-semibold text-amber-300">
                Harga kilat <ChevronRight className="h-3 w-3" />
              </span>
            </span>
          </motion.button>
        </div>
      </section>

      {/* Recommendations grid */}
      <section className="mt-6 px-5">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-[17px] font-extrabold tracking-tight">
              {quick ? QUICK.find((q) => q.key === quick)?.label : "Rekomendasi di Sekitarmu"}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {stores ? `${results.length} UMKM ditemukan` : "Mencari UMKM terbaik…"}
            </p>
          </div>
          {circle && (
            <button
              onClick={() => { setCircle(""); setQuick(""); }}
              className="press rounded-full bg-teal-50 px-3 py-1.5 text-[10px] font-extrabold text-primary"
            >
              Reset filter ✕
            </button>
          )}
        </div>

        {!stores ? (
          <SkeletonList count={4} />
        ) : results.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title="Nggak ada yang cocok"
            description="Coba kata kunci atau kategori lain ya!"
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {results.map((store, idx) => {
              const cover =
                store.products.find((p) => p.imageUrl) ??
                store.products[0] ??
                null;
              const cheapest = [...store.products].sort((a, b) => a.price - b.price)[0];
              return (
                <motion.button
                  key={store.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.3) }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onOpenStore(store.id)}
                  className="press overflow-hidden rounded-3xl border border-teal-50 bg-white text-left card-soft"
                >
                  <div className="relative h-28 w-full">
                    {cover && (cover.imageUrl || cover.emoji) ? (
                      <ProductThumbInline
                        imageUrl={cover.imageUrl}
                        emoji={cover.emoji}
                        name={store.name}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-brand-gradient text-3xl text-white">
                        🍽️
                      </div>
                    )}
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur">
                      <MapPin className="h-2.5 w-2.5" /> {store.distanceKm.toFixed(1)} km
                    </span>
                    {store.products.some((p) => p.isFlashSale) && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white">
                        <Zap className="h-2.5 w-2.5 fill-white" />
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="truncate text-xs font-extrabold text-foreground">{store.name}</h3>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Stars rating={store.rating} className="text-amber-500" />
                      <span className="truncate text-[10px] text-muted-foreground">· {store.category}</span>
                    </div>
                    {cheapest && (
                      <p className="mt-1.5 truncate text-[10px] font-bold text-primary">
                        Mulai {formatRupiah(cheapest.price)}
                      </p>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-8 pb-2 text-center text-[10px] text-slate-400">
        Jajan Riyen · Jelajahi rasa di sekitarmu 🧭
      </div>
    </div>
  );
}

function ProductThumbInline({
  imageUrl,
  emoji,
  name,
}: {
  imageUrl: string | null;
  emoji: string;
  name: string;
}) {
  if (imageUrl) {
    return (
      <img src={imageUrl} alt={name} className="h-full w-full object-cover" loading="lazy" />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-100 via-teal-50 to-emerald-50 text-4xl">
      {emoji}
    </div>
  );
}
