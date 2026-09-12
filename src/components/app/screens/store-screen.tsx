"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Clock3,
  Star,
  ChevronRight,
  Zap,
  Plus,
  ShoppingBag,
} from "lucide-react";
import type { Product, Store } from "@/lib/types";
import { formatRupiah, discountPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCartStore } from "@/lib/app-store";
import { CartBar } from "../widgets";
import { ProductThumb, Stars, SkeletonList, EmptyState } from "../shared";

export default function StoreScreen({
  storeId,
  onBack,
  onOpenProduct,
  onOpenCart,
}: {
  storeId: string;
  onBack: () => void;
  onOpenProduct: (productId: string) => void;
  onOpenCart: () => void;
}) {
  const [store, setStore] = useState<Store | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [conflictProduct, setConflictProduct] = useState<Product | null>(null);
  const [addedFlash, setAddedFlash] = useState<string | null>(null);

  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    let alive = true;
    fetch(`/api/stores/${storeId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        if (data.store) setStore(data.store as Store);
        else setNotFound(true);
      })
      .catch(() => alive && setNotFound(true));
    return () => {
      alive = false;
    };
  }, [storeId]);

  const quickAdd = (product: Product) => {
    if (!store || product.stock <= 0) return;
    const result = addItem(product, store);
    if (result === "conflict") {
      setConflictProduct(product);
      return;
    }
    setAddedFlash(product.id);
    setTimeout(() => setAddedFlash(null), 900);
  };

  if (notFound) {
    return (
      <div className="pt-6">
        <button onClick={onBack} className="press ml-4 flex items-center gap-1 text-sm font-bold text-primary">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>
        <EmptyState title="Toko tidak ditemukan" description="Toko mungkin telah ditutup." />
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Hero header — banner foto latar di belakang nama toko */}
      <div className="relative rounded-b-[2rem] overflow-hidden pb-16 pt-6">
        {store?.bannerUrl && (
          <img
            src={store.bannerUrl}
            alt={`Banner ${store.name}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div
          className={cn(
            "absolute inset-0",
            store?.bannerUrl
              ? "bg-gradient-to-t from-slate-950/75 via-slate-950/35 to-slate-950/30"
              : "bg-brand-gradient"
          )}
        />
        <motion.div
          className="absolute -right-10 -bottom-16 h-48 w-48 rounded-full bg-white/10"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative z-10 px-5">
          <button
            onClick={onBack}
            className="press flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        {store && (
          <div className="relative z-10 mt-4 flex items-center gap-3 px-5">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-3xl bg-white shadow-lg">
              {store.logoUrl ? (
                <img src={store.logoUrl} alt={`Logo ${store.name}`} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-3xl">
                  {store.category === "Minuman" ? "🧋" : store.category === "Dessert" ? "🍰" : "🍛"}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold text-white drop-shadow-sm">{store.name}</h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-teal-50/90 drop-shadow">
                <Stars rating={store.rating} className="text-amber-300" />
                <span>·</span>
                <span>{store.category}</span>
                <span>·</span>
                <span>{store.distanceKm.toFixed(1)} km</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {!store ? (
        <div className="px-5 pt-6">
          <SkeletonList count={3} />
        </div>
      ) : (
        <>
          {/* Info card */}
          <div className="relative z-10 -mt-10 px-5">
            <div className="rounded-3xl border border-teal-50 bg-white p-4 card-soft">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-600">
                  <Clock3 className="h-3 w-3" /> Buka {store.openTime}–{store.closeTime}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 font-bold text-teal-700">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {store.rating.toFixed(1)} rating
                </span>
                {store.qrisEnabled && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 font-bold text-violet-600">
                    🔳 Terima QRIS
                  </span>
                )}
              </div>
              {store.description && (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{store.description}</p>
              )}
              {store.address && (
                <div className="mt-3 flex items-start gap-2 border-t border-dashed border-border pt-3 text-[11px] text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{store.address}</span>
                </div>
              )}
              <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-primary">
                <Phone className="h-3.5 w-3.5" /> Hubungi penjual (simulasi)
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="mt-6 px-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-extrabold tracking-tight">Menu &amp; Promo</h2>
              <span className="text-xs font-semibold text-muted-foreground">{store.products.length} produk</span>
            </div>
            <div className="space-y-3">
              {store.products.map((product, idx) => {
                const pct = discountPercent(product.price, product.originalPrice);
                const soldOut = product.stock <= 0;
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="overflow-hidden rounded-3xl border border-teal-50 bg-white card-soft"
                  >
                    <button
                      onClick={() => !soldOut && onOpenProduct(product.id)}
                      className="flex w-full items-start gap-3 p-3.5 text-left"
                      aria-label={`Lihat ${product.name}`}
                    >
                      <div className="relative shrink-0">
                        <ProductThumb product={product} className="h-[74px] w-[74px]" />
                        {product.isFlashSale && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-md">
                            <Zap className="h-3 w-3 fill-white" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-extrabold text-foreground">{product.name}</h3>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                          {product.description}
                        </p>
                        <div className="mt-1.5 flex items-baseline gap-1.5">
                          <span className="text-[15px] font-extrabold text-primary">{formatRupiah(product.price)}</span>
                          {pct && (
                            <>
                              <span className="text-[10px] font-medium text-slate-400 line-through">
                                {formatRupiah(product.originalPrice!)}
                              </span>
                              <span className="rounded bg-red-50 px-1 py-px text-[9px] font-extrabold text-red-500">
                                -{pct}%
                              </span>
                            </>
                          )}
                        </div>
                        <p className="mt-1 text-[10px] font-semibold text-slate-400">
                          {product.sold.toLocaleString("id-ID")}+ terjual · stok {product.stock}
                        </p>
                      </div>
                      <ChevronRight className="mt-6 h-4 w-4 shrink-0 text-slate-300" />
                    </button>
                    <div className="voucher-notch flex items-center gap-2 border-t border-dashed border-teal-100 px-3.5 py-2.5">
                      <Button
                        onClick={() => quickAdd(product)}
                        disabled={soldOut}
                        className="press h-9 w-12 shrink-0 rounded-xl bg-teal-50 p-0 text-primary shadow-none hover:bg-teal-100 disabled:opacity-40"
                        aria-label={`Tambah ${product.name} ke keranjang`}
                      >
                        {addedFlash === product.id ? (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-sm">
                            ✓
                          </motion.span>
                        ) : (
                          <Plus className="h-4 w-4" strokeWidth={3} />
                        )}
                      </Button>
                      <Button
                        onClick={() => onOpenProduct(product.id)}
                        disabled={soldOut}
                        className="press h-9 flex-1 rounded-xl bg-primary text-xs font-extrabold shadow-md shadow-teal-500/25 hover:bg-teal-700 disabled:opacity-40"
                      >
                        {soldOut ? "Stok Habis" : "Beli Sekarang"}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Floating cart bar */}
      <CartBar onOpen={onOpenCart} aboveNav={false} />

      {/* Cross-store conflict dialog */}
      <AlertDialog open={!!conflictProduct} onOpenChange={(o) => !o && setConflictProduct(null)}>
        <AlertDialogContent className="max-w-[400px] rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Ganti isi keranjang?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Keranjangmu berisi item dari toko lain. Transaksi antar UMKM harus terpisah — keranjang akan
              diganti dengan item dari <b>{store?.name}</b>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-primary hover:bg-teal-700"
              onClick={() => {
                if (conflictProduct && store) {
                  addItem(conflictProduct, store, true);
                  setAddedFlash(conflictProduct.id);
                  setTimeout(() => setAddedFlash(null), 900);
                }
                setConflictProduct(null);
              }}
            >
              Ya, Ganti
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
