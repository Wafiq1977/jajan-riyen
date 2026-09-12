"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  ShoppingCart,
  X,
  Zap,
  ChevronRight,
  Timer,
  MapPin,
  Bell,
  CheckCheck,
  Navigation,
} from "lucide-react";
import QRCodeLib from "qrcode";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { formatRupiah, formatDateTime } from "@/lib/format";
import {
  AREAS,
  buildNotifications,
  cartTotalPrice,
  cartTotalQty,
  useCartStore,
  useNotifStore,
  usePrefsStore,
} from "@/lib/app-store";

/* ---------------- scroll hook ---------------- */

export function useScrolled(threshold = 20) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

/* ---------------- transparent top navbar ---------------- */

export function TopBar({
  children,
  className,
}: {
  children: (scrolled: boolean) => React.ReactNode;
  className?: string;
}) {
  const scrolled = useScrolled(24);
  return (
    <div
      className={cn(
        "fixed top-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 transition-all duration-300 ease-out",
        scrolled
          ? "nav-glass border-b border-teal-100/70 shadow-[0_10px_30px_-18px_rgba(13,148,136,0.45)]"
          : "nav-ghost border-b border-transparent",
        className
      )}
    >
      <div className="flex h-14 items-center justify-between px-5">{children(scrolled)}</div>
    </div>
  );
}

/* ---------------- top bar action buttons ---------------- */

/** Keranjang — pojok kanan atas (badge jumlah item). */
export function CartIconButton({
  scrolled,
  onClick,
}: {
  scrolled: boolean;
  onClick: () => void;
}) {
  const items = useCartStore((s) => s.items);
  const qty = cartTotalQty(items);
  return (
    <button
      onClick={onClick}
      className={cn(
        "press relative flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition-colors",
        scrolled ? "bg-teal-50 text-primary" : "bg-white/15 text-white"
      )}
      aria-label={`Keranjang belanja, ${qty} item`}
    >
      <ShoppingCart className="h-4 w-4" />
      <AnimatePresence>
        {qty > 0 && (
          <motion.span
            key={qty}
            initial={{ scale: 0.4 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-black text-teal-950"
            style={scrolled ? { boxShadow: "0 0 0 2px white" } : { boxShadow: "0 0 0 2px rgba(13,148,136,0.9)" }}
          >
            {qty}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/** Notifikasi — klik-able, buka sheet notifikasi. */
export function BellIconButton({
  scrolled,
  onClick,
  unread,
}: {
  scrolled: boolean;
  onClick: () => void;
  unread: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "press relative flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition-colors",
        scrolled ? "bg-teal-50 text-primary" : "bg-white/15 text-white"
      )}
      aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
    >
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <motion.span
          key={unread}
          initial={{ scale: 0.4 }}
          animate={{ scale: [1, 1.25, 1] }}
          className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400"
          style={scrolled ? { boxShadow: "0 0 0 2px white" } : { boxShadow: "0 0 0 2px rgba(13,148,136,0.9)" }}
        />
      )}
    </button>
  );
}

/** Lokasi — klik-able, buka pemilih area. */
export function AreaButton({
  scrolled,
  area,
  onClick,
}: {
  scrolled: boolean;
  area: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "press flex h-9 min-w-0 items-center gap-1 rounded-full px-3 text-xs font-bold backdrop-blur transition-colors",
        scrolled ? "bg-teal-50 text-primary" : "bg-white/15 text-white"
      )}
      aria-label={`Ubah lokasi, saat ini ${area}`}
    >
      <MapPin className="h-3.5 w-3.5 shrink-0" />
      <span className="max-w-[72px] truncate sm:max-w-[100px]">{area}</span>
      <span className="text-[9px] opacity-70">▼</span>
    </button>
  );
}

/* ---------------- location picker sheet ---------------- */

export function LocationSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { area, setArea } = usePrefsStore();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-[430px] rounded-t-[28px]">
        <div className="px-5 pb-8">
          <DrawerHeader className="px-0 pb-2 pt-1 text-left">
            <DrawerTitle className="flex items-center gap-2 text-base">
              <Navigation className="h-[18px] w-[18px] text-primary" />
              Pilih Lokasi Jajanmu
            </DrawerTitle>
            <DrawerDescription className="text-left text-[11px]">
              Toko &amp; rekomendasi disesuaikan dengan area yang kamu pilih.
            </DrawerDescription>
          </DrawerHeader>

          <div className="grid grid-cols-2 gap-2">
            {AREAS.map((a) => {
              const active = a === area;
              return (
                <button
                  key={a}
                  onClick={() => {
                    setArea(a);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "press flex items-center gap-2 rounded-2xl border-2 px-3.5 py-3 text-left transition-all",
                    active
                      ? "border-primary bg-teal-50/70 shadow-sm"
                      : "border-teal-50 bg-white hover:border-teal-200"
                  )}
                  aria-pressed={active}
                >
                  <MapPin className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-slate-300")} />
                  <span className={cn("truncate text-xs font-extrabold", active ? "text-primary" : "text-foreground")}>
                    {a}
                  </span>
                  {active && <CheckCheck className="ml-auto h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>

          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-emerald-50/70 p-3 text-[10px] font-medium leading-relaxed text-emerald-700">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Lokasi disimulasikan untuk demo — pilih area terdekat agar rekomendasi lebih relevan.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ---------------- notifications sheet ---------------- */

export function NotificationSheet({
  open,
  onOpenChange,
  onOpenOrders,
  onOpenFlashSale,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onOpenOrders: () => void;
  onOpenFlashSale: () => void;
}) {
  const orders = useNotifStore((s) => s.orders);
  const markRead = useNotifStore((s) => s.markRead);
  const notifs = buildNotifications(orders);

  useEffect(() => {
    if (open) markRead();
  }, [open, markRead]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-[430px] rounded-t-[28px]">
        <div className="px-5 pb-8">
          <DrawerHeader className="px-0 pb-2 pt-1 text-left">
            <DrawerTitle className="flex items-center gap-2 text-base">
              <Bell className="h-[18px] w-[18px] text-primary" />
              Notifikasi
            </DrawerTitle>
            <DrawerDescription className="text-left text-[11px]">
              Update pesanan &amp; promo terbaru buat kamu.
            </DrawerDescription>
          </DrawerHeader>

          {notifs.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">Belum ada notifikasi.</p>
          ) : (
            <div className="pretty-scroll max-h-[56vh] space-y-2 overflow-y-auto pr-1">
              {notifs.slice(0, 12).map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    onOpenChange(false);
                    if (n.kind === "order") onOpenOrders();
                    else onOpenFlashSale();
                  }}
                  className="press flex w-full items-start gap-3 rounded-2xl border border-teal-50 bg-white p-3 text-left card-soft hover:border-teal-100"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-base">
                    {n.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-extrabold text-foreground">{n.title}</span>
                      {n.kind === "order" && n.orderStatus && (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-black",
                            n.orderStatus === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-600"
                              : n.orderStatus === "PROCESSING"
                                ? "bg-teal-50 text-teal-600"
                                : n.orderStatus === "CANCELLED"
                                  ? "bg-red-50 text-red-400"
                                  : "bg-amber-50 text-amber-600"
                          )}
                        >
                          {n.orderStatus === "PENDING"
                            ? "BARU"
                            : n.orderStatus === "PROCESSING"
                              ? "DIPROSES"
                              : n.orderStatus === "COMPLETED"
                                ? "SELESAI"
                                : "BATAL"}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-muted-foreground">
                      {n.body}
                    </span>
                    <span className="mt-1 block text-[9px] font-semibold text-slate-300">
                      {formatDateTime(n.at)}
                    </span>
                  </span>
                  <ChevronRight className="mt-3 h-3.5 w-3.5 shrink-0 text-slate-300" />
                </button>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ---------------- countdown to midnight ---------------- */

export function useMidnightCountdown() {
  const [left, setLeft] = useState("--:--:--");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const diff = Math.max(0, end.getTime() - now.getTime());
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);
  return left;
}

export function CountdownChip({ className, label = "Berakhir dalam" }: { className?: string; label?: string }) {
  const left = useMidnightCountdown();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-red-500/95 px-3 py-1 text-[10px] font-extrabold text-white shadow-md shadow-red-500/30",
        className
      )}
    >
      <Zap className="h-3 w-3 fill-white" />
      {label}
      <span className="rounded-md bg-white/20 px-1.5 py-0.5 font-mono tabular-nums">{left}</span>
    </span>
  );
}

/* ---------------- QRIS panel (shared checkout + cart) ---------------- */

export function QrisPanel({
  merchantName,
  merchantId,
  description,
  amount,
  sellerQris,
}: {
  merchantName: string;
  merchantId: string;
  description: string;
  amount: number;
  /** QRIS milik penjual (gambar yang diunggah + kode merchant) */
  sellerQris?: { imageUrl: string | null; code: string | null } | null;
}) {
  const [qr, setQr] = useState<string | null>(null);

  const useSellerImage = Boolean(sellerQris?.imageUrl);

  useEffect(() => {
    if (useSellerImage) return;
    let alive = true;
    const payload = [
      "JRPAY",
      "QRIS",
      `MERCHANT:${merchantName}`,
      `MID:${merchantId.slice(-8).toUpperCase()}`,
      `ITEM:${description}`.slice(0, 60),
      `AMOUNT:${amount}`,
    ].join("|");
    QRCodeLib.toDataURL(payload, {
      width: 512,
      margin: 1,
      color: { dark: "#0f2e2b", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((url) => alive && setQr(url))
      .catch(() => alive && setQr(null));
    return () => {
      alive = false;
    };
  }, [merchantName, merchantId, description, amount, useSellerImage]);

  return (
    <div className="mt-3 rounded-3xl border border-violet-100 bg-gradient-to-b from-violet-50/70 to-white p-5 text-center">
      <div className="flex items-center justify-center gap-2">
        <span className="rounded-md bg-violet-600 px-2 py-0.5 text-[10px] font-black tracking-widest text-white">
          QRIS
        </span>
        <span className="text-[10px] font-bold text-violet-500">
          {useSellerImage ? `QRIS resmi ${merchantName}` : "1 QRIS untuk semua aplikasi pembayaran"}
        </span>
      </div>
      <div className="mx-auto mt-3 w-fit rounded-2xl border-2 border-violet-200 bg-white p-3 shadow-inner">
        {useSellerImage ? (
          <motion.img
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            src={sellerQris!.imageUrl!}
            alt={`Kode QRIS ${merchantName}`}
            className="h-40 w-40 rounded-lg object-contain sm:h-44 sm:w-44"
          />
        ) : qr ? (
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            src={qr}
            alt="Kode QRIS pembayaran"
            className="h-40 w-40 sm:h-44 sm:w-44"
          />
        ) : (
          <div className="flex h-40 w-40 items-center justify-center sm:h-44 sm:w-44">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-500" />
          </div>
        )}
      </div>
      {sellerQris?.code && (
        <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full bg-white px-3.5 py-1.5 shadow-sm">
          <span className="text-[9px] font-bold uppercase tracking-wider text-violet-400">NMID</span>
          <span className="font-mono text-[11px] font-black tracking-wider text-slate-600">{sellerQris.code}</span>
        </div>
      )}
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-violet-600">
        <ScanLineIcon />
        Scan pakai GoPay, OVO, DANA, m-Banking
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-slate-500 shadow-sm">
        <Timer className="h-3 w-3 text-violet-400" />
        Ini simulasi pembayaran — langsung tekan tombol buat pesanan
      </div>
    </div>
  );
}

function ScanLineIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

/* ---------------- floating cart bar (store screen checkout shortcut) ---------------- */

export function CartBar({
  onOpen,
  aboveNav = true,
}: {
  onOpen: () => void;
  aboveNav?: boolean;
}) {
  const items = useCartStore((s) => s.items);
  const storeName = useCartStore((s) => s.storeName);
  if (items.length === 0) return null;

  const qty = cartTotalQty(items);
  const total = cartTotalPrice(items);

  return (
    <motion.div
      initial={{ y: 90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 90, opacity: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      className="fixed left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 px-4"
      style={{
        bottom: aboveNav
          ? "calc(5.75rem + env(safe-area-inset-bottom))"
          : "calc(1rem + env(safe-area-inset-bottom))",
      }}
    >
      <button
        onClick={onOpen}
        className="press flex w-full items-center gap-3 rounded-2xl bg-brand-gradient px-4 py-3 text-left shadow-xl shadow-teal-600/35"
        aria-label="Buka keranjang belanja"
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur">
          <ShoppingBag className="h-5 w-5" />
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-teal-950">
            {qty}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-extrabold text-white">{storeName ?? "Keranjang"}</span>
          <span className="block text-[10px] font-semibold text-teal-50/90">
            {qty} item siap kamu bayar sekali transaksi
          </span>
        </span>
        <span className="flex items-center gap-1 text-sm font-extrabold text-white">
          {formatRupiah(total)}
          <ChevronRight className="h-4 w-4" />
        </span>
      </button>
    </motion.div>
  );
}

/* ---------------- flash sale popup (after login) ---------------- */

export function FlashSalePopup({
  open,
  onClose,
  onOpenSale,
}: {
  open: boolean;
  onClose: () => void;
  onOpenSale: () => void;
}) {
  const left = useMidnightCountdown();
  if (!open) return null;

  const [h, m, s] = left.split(":");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-teal-950/60 px-6 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Promo flash sale"
    >
      <motion.div
        initial={{ scale: 0.8, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="relative w-full max-w-[330px] overflow-hidden rounded-[28px] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="press absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur"
          aria-label="Tutup promo"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Poster */}
        <div className="relative h-[310px] w-full sm:h-[340px]">
          <img
            src="/flashsale-poster.png"
            alt="Poster flash sale Jajan Riyen"
            className="h-full w-full object-cover"
            style={{ objectPosition: "50% 68%" }}
          />
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-teal-950/90 via-teal-900/50 to-transparent px-5 pb-12 pt-6">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black tracking-wide text-teal-950">
              <Zap className="h-3 w-3 fill-teal-950" /> FLASH SALE HARI INI
            </span>
            <h3 className="mt-2 text-[26px] font-black leading-[1.1] text-white drop-shadow">
              Diskon sampai
              <br />
              <span className="text-amber-300">45%</span> tiap jajan!
            </h3>
          </div>
        </div>

        {/* Body */}
        <div className="-mt-5 relative z-10 rounded-t-[24px] bg-white px-5 pb-5 pt-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Berakhir dalam</p>
          <div className="mt-1.5 flex items-center justify-center gap-1.5">
            {[h, m, s].map((unit, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-sm font-black text-slate-300">:</span>}
                <span className="flex h-10 w-11 items-center justify-center rounded-xl bg-teal-50 font-mono text-base font-extrabold tabular-nums text-teal-700">
                  {unit}
                </span>
              </span>
            ))}
          </div>
          <button
            onClick={onOpenSale}
            className="press mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient text-sm font-extrabold text-white shadow-lg shadow-teal-500/35"
          >
            <Zap className="h-4 w-4 fill-white" />
            Serbu Diskonnya!
          </button>
          <button
            onClick={onClose}
            className="mt-2.5 text-[11px] font-bold text-slate-400 hover:text-slate-600"
          >
            Nanti dulu, saya mau lihat-lihat dulu
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
