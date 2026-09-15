"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  Banknote,
  QrCode,
  CheckCircle2,
  Store as StoreIcon,
  MapPin,
} from "lucide-react";
import type { PaymentMethod, Store, User } from "@/lib/types";
import { formatRupiah, discountPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cartTotalPrice, cartTotalQty, useCartStore } from "@/lib/app-store";
import { QrisPanel, QrisRefInput, OrderNoteInput } from "../widgets";
import { ProductThumb, EmptyState } from "../shared";

export default function CartScreen({
  user,
  onExplore,
  onDone,
}: {
  user: User | null;
  onExplore: () => void;
  onDone: (orderId: string, method: PaymentMethod) => void;
}) {
  const { items, storeId, storeName, setQuantity, removeItem } = useCartStore();
  const [method, setMethod] = useState<PaymentMethod>("TUNAI");
  const [refCode, setRefCode] = useState(""); // bukti bayar QRIS manual (opsional)
  const [note, setNote] = useState(""); // catatan pesanan — request khusus ke penjual (opsional)
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<Store | null>(null);

  // Fetch toko keranjang — untuk cek QRIS penjual
  useEffect(() => {
    if (!storeId) {
      setStore(null);
      return;
    }
    let alive = true;
    fetch(`/api/stores/${storeId}`)
      .then((r) => r.json())
      .then((data) => alive && setStore((data.store as Store) ?? null))
      .catch(() => alive && setStore(null));
    return () => {
      alive = false;
    };
  }, [storeId]);

  const qrisAvailable = Boolean(store?.qrisEnabled);

  const total = useMemo(() => cartTotalPrice(items), [items]);
  const qty = useMemo(() => cartTotalQty(items), [items]);
  const savings = useMemo(
    () =>
      items.reduce(
        (sum, i) =>
          sum + (i.originalPrice && i.originalPrice > i.price ? (i.originalPrice - i.price) * i.quantity : 0),
        0
      ),
    [items]
  );

  const submit = async () => {
    if (!user || items.length === 0 || submitting || !storeId) return;
    const code = refCode.trim();
    if (method === "QRIS" && code && (code.length < 4 || code.length > 64)) {
      setError("Kode referensi harus 4–64 karakter — salin dari bukti transaksi e-wallet/m-banking-mu.");
      return;
    }
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
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          ...(method === "QRIS" && code ? { referenceCode: code } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat pesanan");
      onDone(data.order.id as string, method);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat pesanan");
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div>
        <CartHeader qty={0} storeName={null} />
        <div className="px-5">
          <EmptyState
            icon={ShoppingBag}
            title="Keranjangmu masih kosong"
            description="Masukkan jajanan favorit dari satu UMKM, lalu bayar sekali transaksi. Pesanan antar UMKM selalu dipisah ya!"
            action={
              <Button
                onClick={onExplore}
                className="press h-11 rounded-2xl bg-primary px-6 text-sm font-extrabold shadow-lg shadow-teal-500/30 hover:bg-teal-700"
              >
                🧭 Jelajahi UMKM
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-56">
      <CartHeader qty={qty} storeName={storeName} />

      {/* One-UMKM note */}
      <div className="px-5 pt-4">
        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 text-[11px] font-medium leading-relaxed text-emerald-700">
          <StoreIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Semua item di keranjang ini dari <b>{storeName}</b> — jadi cukup <b>1 transaksi</b>. Mau jajan di
            UMKM lain? Keranjang akan dibuat terpisah otomatis.
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="mt-4 space-y-3 px-5">
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const pct = discountPercent(item.price, item.originalPrice);
            return (
              <motion.div
                key={item.productId}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -60, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden rounded-3xl border border-teal-50 bg-white p-3.5 card-soft"
              >
                <div className="flex items-start gap-3">
                  <ProductThumb product={item} className="h-16 w-16 shrink-0" rounded="rounded-2xl" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-extrabold text-foreground">{item.name}</h3>
                    <div className="mt-0.5 flex items-baseline gap-1.5">
                      <span className="text-sm font-extrabold text-primary">{formatRupiah(item.price)}</span>
                      {pct && (
                        <span className="rounded bg-red-50 px-1 py-px text-[9px] font-extrabold text-red-500">
                          -{pct}%
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                      stok {item.stock} · subtotal {formatRupiah(item.price * item.quantity)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-500"
                    aria-label={`Hapus ${item.name} dari keranjang`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Qty stepper */}
                <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Jumlah
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className={cn(
                        "press flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                        item.quantity <= 1
                          ? "border-slate-100 text-slate-300"
                          : "border-teal-200 bg-teal-50 text-primary hover:bg-teal-100"
                      )}
                      aria-label="Kurangi jumlah"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <motion.span
                      key={item.quantity}
                      initial={{ scale: 1.25 }}
                      animate={{ scale: 1 }}
                      className="w-7 text-center text-sm font-extrabold"
                    >
                      {item.quantity}
                    </motion.span>
                    <button
                      onClick={() => setQuantity(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                      className={cn(
                        "press flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                        item.quantity >= item.stock
                          ? "bg-slate-100 text-slate-300"
                          : "bg-primary text-white shadow-md shadow-teal-500/30 hover:bg-teal-700"
                      )}
                      aria-label="Tambah jumlah"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Catatan pesanan — request khusus pembeli ke penjual (sama seperti checkout) */}
      <div className="mt-4 px-5">
        <OrderNoteInput value={note} onChange={setNote} />
      </div>

      {/* Payment method */}
      <div className="mt-5 px-5">
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
            onClick={() => qrisAvailable && setMethod("QRIS")}
            disabled={!qrisAvailable}
            icon={<QrCode className="h-6 w-6" />}
            title="QRIS"
            subtitle={qrisAvailable ? "Scan & kirim kode referensi" : "Penjual belum aktifkan"}
          />
        </div>

        {!qrisAvailable && (
          <p className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
            <QrCode className="h-3 w-3" />
            {storeName ?? "Toko ini"} belum mengaktifkan pembayaran QRIS — silakan pilih Tunai.
          </p>
        )}

        <AnimatePresence>
          {method === "QRIS" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <QrisPanel
                merchantName={storeName ?? "Jajan Riyen"}
                merchantId={storeId ?? "0000"}
                description={`${qty} item keranjang`}
                amount={total}
                sellerQris={store?.qrisEnabled ? { imageUrl: store.qrisImageUrl, code: store.qrisCode } : null}
              />
              {/* Kolom nomor referensi / kode transaksi — bukti bayar QRIS manual */}
              <QrisRefInput value={refCode} onChange={setRefCode} />
            </motion.div>
          )}
        </AnimatePresence>

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
          <Row label={`Subtotal ${qty} item`} value={formatRupiah(total)} />
          {savings > 0 && <Row label="Hemat diskon" value={`-${formatRupiah(savings)}`} highlight />}
          <Row label="Biaya layanan" value="Gratis" muted />
          <div className="mt-2 flex items-center justify-between border-t border-dashed border-border pt-3">
            <span className="text-sm font-extrabold">Total Bayar</span>
            <span className="text-lg font-extrabold text-primary">{formatRupiah(total)}</span>
          </div>
        </div>
      </div>

      {error && <p className="mt-3 px-5 text-center text-xs font-semibold text-red-500">{error}</p>}

      {/* Sticky footer — sits above the bottom tab nav */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30, delay: 0.1 }}
        className="fixed left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 bottom-[calc(76px+env(safe-area-inset-bottom))]"
      >
        <div className="mx-4 rounded-3xl border border-teal-100/70 bg-white/95 p-4 backdrop-blur-xl shadow-[0_-10px_40px_-12px_rgba(13,148,136,0.4)]">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground">
                Total · {qty} item
              </p>
              <p className="text-lg font-extrabold leading-tight text-primary">{formatRupiah(total)}</p>
            </div>
            <Button
              onClick={submit}
              disabled={!user || submitting || items.length === 0}
              className="press ml-auto h-12 min-w-[170px] flex-1 rounded-2xl bg-primary text-sm font-extrabold shadow-lg shadow-teal-500/30 hover:bg-teal-700 disabled:opacity-40"
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

function CartHeader({ qty, storeName }: { qty: number; storeName: string | null }) {
  return (
    <div className="relative bg-brand-gradient px-5 rounded-b-[2rem] overflow-hidden pb-12 pt-8">
      <motion.div
        className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative z-10 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur">
          <ShoppingBag className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-white">Keranjang</h1>
          {storeName ? (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-teal-50/90">
              <MapPin className="h-3 w-3 shrink-0" /> {storeName} · {qty} item
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-teal-50/90">Belanja sekali bayar per UMKM</p>
          )}
        </div>
      </div>
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
