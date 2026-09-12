"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Banknote,
  QrCode,
  CheckCircle2,
  Minus,
  Plus,
} from "lucide-react";
import type { PaymentMethod, Product, Store, User } from "@/lib/types";
import { formatRupiah, discountPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QrisPanel } from "../widgets";
import { ProductThumb } from "../shared";

export default function CheckoutScreen({
  user,
  productId,
  storeId,
  onBack,
  onDone,
}: {
  user: User | null;
  productId: string;
  storeId: string;
  onBack: () => void;
  onDone: (orderId: string) => void;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState<PaymentMethod>("TUNAI");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/stores/${storeId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        const s = data.store as Store | undefined;
        if (s) {
          setStore(s);
          setProduct(s.products.find((x) => x.id === productId) ?? null);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [productId, storeId]);

  const total = useMemo(() => (product ? product.price * qty : 0), [product, qty]);
  const savings = useMemo(
    () => (product && product.originalPrice ? (product.originalPrice - product.price) * qty : 0),
    [product, qty]
  );

  const submit = async () => {
    if (!user || !product || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          storeId,
          paymentMethod: method,
          items: [{ productId, quantity: qty }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat pesanan");
      onDone(data.order.id as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat pesanan");
      setSubmitting(false);
    }
  };

  const maxQty = product ? Math.min(product.stock, 10) : 10;
  const pct = product ? discountPercent(product.price, product.originalPrice) : null;

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-teal-50 bg-white/90 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <button
            onClick={onBack}
            className="press flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-primary"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
          <h1 className="text-base font-extrabold">Checkout</h1>
        </div>
      </div>

      {/* Product summary */}
      <div className="px-5 pt-4">
        {product && store ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-teal-50 bg-white p-4 card-soft"
          >
            <div className="flex gap-3">
              <ProductThumb product={product} className="h-16 w-16" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{store.name}</p>
                <h3 className="truncate text-sm font-extrabold text-foreground">{product.name}</h3>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-sm font-extrabold text-primary">{formatRupiah(product.price)}</span>
                  {pct && (
                    <span className="rounded bg-red-50 px-1 py-px text-[9px] font-extrabold text-red-500">
                      -{pct}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Qty stepper */}
            <div className="mt-4 flex items-center justify-between border-t border-dashed border-border pt-4">
              <span className="text-xs font-bold text-foreground">Jumlah</span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-semibold text-slate-400">maks {maxQty}</span>
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  className={cn(
                    "press flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors",
                    qty <= 1
                      ? "border-slate-100 text-slate-300"
                      : "border-teal-200 bg-teal-50 text-primary hover:bg-teal-100"
                  )}
                  aria-label="Kurangi jumlah"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <motion.span
                  key={qty}
                  initial={{ scale: 1.25 }}
                  animate={{ scale: 1 }}
                  className="w-8 text-center text-base font-extrabold"
                >
                  {qty}
                </motion.span>
                <button
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  disabled={qty >= maxQty}
                  className={cn(
                    "press flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                    qty >= maxQty
                      ? "bg-slate-100 text-slate-300"
                      : "bg-primary text-white shadow-md shadow-teal-500/30 hover:bg-teal-700"
                  )}
                  aria-label="Tambah jumlah"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="h-32 animate-pulse rounded-3xl bg-teal-50" />
        )}
      </div>

      {/* Payment method */}
      <div className="mt-4 px-5">
        <h2 className="mb-2.5 text-sm font-extrabold">Metode Pembayaran</h2>
        <div className="grid grid-cols-2 gap-3">
          <MethodCard
            active={method === "TUNAI"}
            onClick={() => setMethod("TUNAI")}
            icon={<Banknote className="h-6 w-6" />}
            title="Tunai"
            subtitle="Bayar di tempat"
          />
          <MethodCard
            active={method === "QRIS"}
            onClick={() => store?.qrisEnabled && setMethod("QRIS")}
            disabled={!!store && !store.qrisEnabled}
            icon={<QrCode className="h-6 w-6" />}
            title="QRIS"
            subtitle={store && !store.qrisEnabled ? "Penjual belum aktifkan" : "Scan & bayar"}
          />
        </div>

        {store && !store.qrisEnabled && (
          <p className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
            <QrCode className="h-3 w-3" />
            {store.name} belum mengaktifkan pembayaran QRIS — silakan pilih Tunai.
          </p>
        )}

        {method === "QRIS" && product && store && (
          <QrisPanel
            merchantName={store.name}
            merchantId={store.id}
            description={product.name}
            amount={total}
            sellerQris={store.qrisEnabled ? { imageUrl: store.qrisImageUrl, code: store.qrisCode } : null}
          />
        )}

        {method === "TUNAI" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 flex items-start gap-2.5 rounded-2xl bg-orange-50/70 p-3.5 text-[11px] font-medium leading-relaxed text-orange-700"
          >
            <Banknote className="mt-0.5 h-4 w-4 shrink-0" />
            Siapkan uang pas saat mengambil pesanan di toko. Penjual akan mengonfirmasi penerimaan uang.
          </motion.div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 px-5">
        <div className="rounded-3xl border border-teal-50 bg-white p-4 card-soft">
          <Row label={`Harga × ${qty}`} value={formatRupiah(total)} />
          {savings > 0 && <Row label="Hemat diskon" value={`-${formatRupiah(savings)}`} highlight />}
          <Row label="Biaya layanan" value="Gratis" muted />
          <div className="mt-2 flex items-center justify-between border-t border-dashed border-border pt-3">
            <span className="text-sm font-extrabold">Total Bayar</span>
            <span className="text-lg font-extrabold text-primary">{formatRupiah(total)}</span>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-3 px-5 text-center text-xs font-semibold text-red-500">{error}</p>
      )}

      {/* Sticky footer */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30, delay: 0.1 }}
        className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2"
      >
        <div className="border-t border-teal-100/70 bg-white/90 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl shadow-[0_-10px_30px_-15px_rgba(13,148,136,0.35)]">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground">Total</p>
              <p className="text-lg font-extrabold leading-tight text-primary">{formatRupiah(total)}</p>
            </div>
            <Button
              onClick={submit}
              disabled={!product || submitting || qty < 1}
              className="press ml-auto h-12 min-w-[180px] flex-1 rounded-2xl bg-primary text-sm font-extrabold shadow-lg shadow-teal-500/30 hover:bg-teal-700 disabled:opacity-40"
            >
              {submitting ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Buat Pesanan
                </span>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function MethodCard({
  active,
  onClick,
  icon,
  title,
  subtitle,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "press relative rounded-3xl border-2 p-4 text-left transition-all",
        active
          ? "border-primary bg-teal-50/60 shadow-md shadow-teal-500/15"
          : disabled
            ? "cursor-not-allowed border-border bg-slate-50 opacity-60"
            : "border-border bg-white hover:border-teal-200"
      )}
      aria-pressed={active}
      aria-disabled={disabled}
    >
      {active && (
        <motion.span
          layout
          className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
        </motion.span>
      )}
      <span
        className={cn(
          "block w-fit rounded-2xl p-2",
          active ? "bg-primary text-white" : disabled ? "bg-slate-100 text-slate-400" : "bg-teal-50 text-primary"
        )}
      >
        {icon}
      </span>
      <p className="mt-2 text-sm font-extrabold text-foreground">{title}</p>
      <p className="text-[10px] font-semibold text-muted-foreground">{subtitle}</p>
    </button>
  );
}

function Row({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-bold",
          highlight ? "text-emerald-500" : muted ? "text-emerald-500" : "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}
