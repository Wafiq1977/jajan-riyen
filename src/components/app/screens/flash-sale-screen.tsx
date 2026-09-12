"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, ChevronRight, Store as StoreIcon } from "lucide-react";
import type { Product, Store } from "@/lib/types";
import { formatRupiah, discountPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { TopBar, CountdownChip } from "../widgets";
import { ProductThumb, DiscountBadge, SkeletonList, EmptyState } from "../shared";

export default function FlashSaleScreen({
  onBack,
  onOpenProduct,
}: {
  onBack: () => void;
  onOpenProduct: (productId: string, storeId: string) => void;
}) {
  const [stores, setStores] = useState<Store[] | null>(null);

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

  const items = useMemo(() => {
    if (!stores) return [];
    return stores
      .flatMap((s) =>
        s.products
          .filter((p) => p.isFlashSale)
          .map((p) => ({ product: p as Product, store: s }))
      )
      .sort(
        (a, b) =>
          (discountPercent(b.product.price, b.product.originalPrice) ?? 0) -
          (discountPercent(a.product.price, a.product.originalPrice) ?? 0)
      );
  }, [stores]);

  return (
    <div>
      <TopBar>
        {(scrolled) => (
          <>
            <button
              onClick={onBack}
              className={`press flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition-colors ${
                scrolled ? "bg-teal-50 text-primary" : "bg-white/15 text-white"
              }`}
              aria-label="Kembali"
            >
              <ArrowLeft className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            </button>
            <span
              className={`text-sm font-extrabold transition-colors duration-300 ${
                scrolled ? "text-foreground" : "text-white"
              }`}
            >
              Flash Sale
            </span>
            <span className="w-9" />
          </>
        )}
      </TopBar>

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 px-5 rounded-b-[2rem] overflow-hidden pb-16 pt-20">
        <motion.div
          className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15"
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black text-white drop-shadow">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <Zap className="h-5 w-5 fill-white" />
              </span>
              Flash Sale
            </h1>
            <p className="mt-1 text-xs font-semibold text-orange-50/95">
              Harga kilat khusus hari ini — stok super terbatas!
            </p>
          </div>
          <CountdownChip className="bg-teal-950/80 shadow-teal-950/40" label="Berakhir" />
        </div>
      </div>

      {/* Items */}
      <div className="px-5 pt-5">
        {!stores ? (
          <SkeletonList count={4} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="Belum ada flash sale"
            description="Cek lagi nanti ya, penjual sedang menyiapkan promo kilat!"
          />
        ) : (
          <div className="space-y-3">
            {items.map(({ product, store }, idx) => {
              const pct = discountPercent(product.price, product.originalPrice);
              const soldOut = product.stock <= 0;
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.3) }}
                  className="overflow-hidden rounded-3xl border border-orange-100 bg-white card-soft"
                >
                  <button
                    onClick={() => !soldOut && onOpenProduct(product.id, store.id)}
                    className="flex w-full items-center gap-3 p-3.5 text-left"
                    aria-label={`Lihat ${product.name}`}
                  >
                    <div className="relative shrink-0">
                      <ProductThumb product={product} className="h-20 w-20" />
                      <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-black text-white">
                        <Zap className="h-2 w-2 fill-white" /> FLASH
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-extrabold text-foreground">{product.name}</h3>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] font-semibold text-muted-foreground">
                        <StoreIcon className="h-3 w-3 shrink-0 text-primary" /> {store.name} ·{" "}
                        {store.distanceKm.toFixed(1)} km
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-base font-extrabold text-red-500">
                          {formatRupiah(product.price)}
                        </span>
                        {product.originalPrice && (
                          <span className="text-[10px] font-medium text-slate-400 line-through">
                            {formatRupiah(product.originalPrice)}
                          </span>
                        )}
                        <DiscountBadge product={product} />
                      </div>
                      <div className="mt-1.5 h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-orange-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500"
                          style={{ width: `${Math.min(95, 100 - Math.min(product.stock, 100))}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[9px] font-bold text-orange-500">
                        Sisa {product.stock} stok · {product.sold.toLocaleString("id-ID")}+ terjual
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </button>
                  <div className="border-t border-dashed border-orange-100 px-3.5 py-2.5">
                    <Button
                      onClick={() => onOpenProduct(product.id, store.id)}
                      disabled={soldOut}
                      className="press h-9 w-full rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-xs font-extrabold shadow-md shadow-orange-500/30 hover:from-orange-600 hover:to-red-600 disabled:opacity-40"
                    >
                      {soldOut ? "Stok Habis" : pct ? `Beli Sekarang · Hemat ${pct}%` : "Beli Sekarang"}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8 pb-2 text-center text-[10px] text-slate-400">
        Harga flash sale hanya berlaku hari ini ⚡
      </div>
    </div>
  );
}
