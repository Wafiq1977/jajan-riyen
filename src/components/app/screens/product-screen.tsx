"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ShieldCheck,
  CalendarClock,
  Store as StoreIcon,
  ChevronRight,
  Zap,
  Package,
  Plus,
  ShoppingBag,
} from "lucide-react";
import type { Product, Store } from "@/lib/types";
import { formatRupiah, discountPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
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
import { ProductThumb, SkeletonList } from "../shared";

export default function ProductScreen({
  productId,
  storeId,
  onBack,
  onBuy,
}: {
  productId: string;
  storeId: string;
  onBack: () => void;
  onBuy: () => void;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [added, setAdded] = useState(false);

  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    let alive = true;
    fetch(`/api/stores/${storeId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        if (!data.store) return setNotFound(true);
        const s = data.store as Store;
        setStore(s);
        const p = s.products.find((x) => x.id === productId);
        if (p) setProduct(p);
        else setNotFound(true);
      })
      .catch(() => alive && setNotFound(true));
    return () => {
      alive = false;
    };
  }, [productId, storeId]);

  const addToCart = (replace = false) => {
    if (!product || !store || product.stock <= 0) return;
    const result = addItem(product, store, replace);
    if (result === "conflict") {
      setConflict(true);
      return;
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  if (notFound) {
    return (
      <div className="pt-6">
        <button onClick={onBack} className="press ml-4 flex items-center gap-1 text-sm font-bold text-primary">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>
        <div className="py-20 text-center text-sm text-muted-foreground">Produk tidak ditemukan.</div>
      </div>
    );
  }

  const pct = product ? discountPercent(product.price, product.originalPrice) : null;

  return (
    <div className="pb-32">
      {/* Hero image */}
      <div className="relative">
        {product ? (
          <motion.div initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
            <ProductThumb product={product} className="h-72 w-full" rounded="" />
          </motion.div>
        ) : (
          <div className="h-72 w-full animate-pulse bg-teal-50" />
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <button
            onClick={onBack}
            className="press flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-foreground shadow-lg backdrop-blur"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          {product?.isFlashSale && (
            <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1.5 text-[10px] font-extrabold text-white shadow-lg">
              <Zap className="h-3 w-3 fill-white" /> FLASH SALE
            </span>
          )}
        </div>
      </div>

      {product && (
        <>
          {/* Price card */}
          <div className="relative z-10 -mt-8 px-5">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-teal-50 bg-white p-5 card-soft"
            >
              <div className="flex items-end gap-2">
                <span className="text-[26px] font-extrabold leading-none text-primary">
                  {formatRupiah(product.price)}
                </span>
                {pct && (
                  <>
                    <span className="text-xs font-medium text-slate-400 line-through">
                      {formatRupiah(product.originalPrice!)}
                    </span>
                    <span className="rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                      -{pct}%
                    </span>
                  </>
                )}
              </div>
              <h1 className="mt-2 text-lg font-extrabold leading-snug text-foreground">{product.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-teal-700">🏷️ {product.category}</span>
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-600">
                  🔥 {product.sold.toLocaleString("id-ID")}+ terjual
                </span>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-600">
                  <Package className="mr-0.5 inline h-2.5 w-2.5" /> stok {product.stock}
                </span>
              </div>
              {product.description && (
                <p className="mt-3 border-t border-dashed border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              )}
            </motion.div>
          </div>

          {/* Info rows */}
          <div className="mt-4 px-5">
            <div className="divide-y divide-border/70 rounded-3xl border border-teal-50 bg-white card-soft">
              <InfoRow icon={<ShieldCheck className="h-4 w-4 text-primary" />} label="Bayar tunai di tempat atau scan QRIS" chevron />
              <InfoRow icon={<CalendarClock className="h-4 w-4 text-primary" />} label="Berlaku hingga 30 hari setelah dibeli" chevron />
              <InfoRow
                icon={<StoreIcon className="h-4 w-4 text-primary" />}
                label={`Dijual oleh ${store?.name ?? "…"}`}
                chevron
              />
            </div>
          </div>
        </>
      )}

      {/* Sticky buy bar */}
      {product && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30, delay: 0.15 }}
          className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2"
        >
          <div className="border-t border-teal-100/70 bg-white/90 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl shadow-[0_-10px_30px_-15px_rgba(13,148,136,0.35)]">
            <div className="flex items-center gap-2.5">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground">Harga spesial</p>
                <p className="truncate text-lg font-extrabold text-primary">{formatRupiah(product.price)}</p>
              </div>
              <Button
                onClick={() => addToCart()}
                disabled={product.stock <= 0}
                className="press ml-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-primary/60 bg-white p-0 text-primary shadow-md hover:bg-teal-50 disabled:opacity-40"
                aria-label="Tambah ke keranjang"
              >
                {added ? <span className="text-base font-black">✓</span> : <Plus className="h-5 w-5" strokeWidth={3} />}
              </Button>
              <Button
                onClick={onBuy}
                disabled={product.stock <= 0}
                className="press h-12 flex-1 rounded-2xl bg-primary text-sm font-extrabold shadow-lg shadow-teal-500/30 hover:bg-teal-700 disabled:opacity-40"
              >
                {product.stock <= 0 ? "Stok Habis" : "Beli Sekarang →"}
              </Button>
            </div>
            {added && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-600"
              >
                <ShoppingBag className="h-3.5 w-3.5" /> Masuk keranjang! Bisa checkout bareng item lain dari toko ini.
              </motion.p>
            )}
          </div>
        </motion.div>
      )}

      {/* Cross-store conflict dialog */}
      <AlertDialog open={conflict} onOpenChange={setConflict}>
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
                addToCart(true);
                setConflict(false);
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

function InfoRow({
  icon,
  label,
  chevron,
}: {
  icon: React.ReactNode;
  label: string;
  chevron?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      {icon}
      <span className="flex-1 text-xs font-semibold text-foreground">{label}</span>
      {chevron && <ChevronRight className="h-4 w-4 text-slate-300" />}
    </div>
  );
}
