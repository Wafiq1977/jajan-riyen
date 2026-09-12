"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  ShoppingCart,
  X,
  Zap,
  ChevronRight,
  Timer,
  MapPin,
  CheckCheck,
  Navigation,
  LocateFixed,
  Loader2,
  AlertTriangle,
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
import { formatRupiah } from "@/lib/format";
import { AREAS, cartTotalPrice, cartTotalQty, useCartStore, usePrefsStore } from "@/lib/app-store";

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

/** Lokasi — klik-able, buka pemilih lokasi (GPS + area manual). */
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

/* ---------------- reverse geocoding helper ---------------- */

interface GeoHit {
  display_name?: string;
  address?: Record<string, string>;
}

/** Ambil nama tempat dari koordinat (OpenStreetMap Nominatim, gratis tanpa API key). */
export async function reverseGeocode(lat: number, lng: number): Promise<{ label: string; full: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&accept-language=id`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as GeoHit;
    const a = data.address ?? {};
    const label =
      a.neighbourhood || a.village || a.suburb || a.city_district || a.town || a.city || "Lokasiku";
    return { label, full: data.display_name ?? label };
  } catch {
    return null;
  }
}

export type GeoStatus = "idle" | "locating" | "denied" | "error" | "ok";

/** Minta posisi GPS beneran dari perangkat. */
export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Perangkat tidak mendukung GPS"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) reject(new Error("Izin lokasi ditolak"));
        else if (err.code === err.TIMEOUT) reject(new Error("Waktu pengambilan lokasi habis"));
        else reject(new Error("Lokasi tidak tersedia"));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  });
}

/* ---------------- location sheet (GPS real + area manual) ---------------- */

export function LocationSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { area, coords, source, setLocation } = usePrefsStore();
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [fullAddr, setFullAddr] = useState<string | null>(null);

  const detect = useCallback(async () => {
    setStatus("locating");
    setStatusMsg(null);
    try {
      const pos = await getCurrentPosition();
      setStatus("ok");
      const geo = await reverseGeocode(pos.lat, pos.lng);
      setLocation({
        area: geo?.label ?? "Lokasiku",
        coords: pos,
        source: "gps",
      });
      setFullAddr(geo?.full ?? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`);
      onOpenChange(false); // sukses → tutup sheet
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "Gagal mengambil lokasi");
      setStatus(e instanceof Error && e.message.includes("ditolak") ? "denied" : "error");
    }
  }, [setLocation, onOpenChange]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-[430px] rounded-t-[28px]">
        <div className="px-5 pb-8">
          <DrawerHeader className="px-0 pb-2 pt-1 text-left">
            <DrawerTitle className="flex items-center gap-2 text-base">
              <Navigation className="h-[18px] w-[18px] text-primary" />
              Lokasi Jajanmu
            </DrawerTitle>
            <DrawerDescription className="text-left text-[11px]">
              Deteksi otomatis lewat GPS, atau pilih area manual.
            </DrawerDescription>
          </DrawerHeader>

          {/* Deteksi GPS nyata */}
          <button
            onClick={detect}
            disabled={status === "locating"}
            className="press flex w-full items-center gap-3 rounded-2xl bg-brand-gradient px-4 py-3.5 text-left shadow-lg shadow-teal-500/25 disabled:opacity-70"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur">
              {status === "locating" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LocateFixed className="h-5 w-5" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-white">
                {status === "locating" ? "Mencari posisimu…" : "Gunakan Lokasi Saya (GPS)"}
              </span>
              <span className="block text-[10px] font-medium text-teal-50/90">
                {source === "gps" && coords
                  ? `Aktif: ${area} · ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                  : "Izinkan akses lokasi di browser saat diminta"}
              </span>
            </span>
            {source === "gps" && coords && status !== "locating" && (
              <CheckCheck className="h-5 w-5 shrink-0 text-emerald-200" />
            )}
          </button>

          {(status === "denied" || status === "error") && statusMsg && (
            <p className="mt-2 flex items-start gap-1.5 rounded-2xl bg-amber-50 p-3 text-[11px] font-medium leading-relaxed text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {statusMsg}. Gunakan HTTPS agar kamera &amp; GPS bisa diakses, atau pilih area manual di bawah.
            </p>
          )}

          {fullAddr && (
            <p className="mt-2 line-clamp-2 rounded-2xl bg-emerald-50 p-3 text-[10px] font-medium leading-relaxed text-emerald-700">
              📍 {fullAddr}
            </p>
          )}

          <div className="my-4 flex items-center gap-2">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">atau pilih manual</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {AREAS.map((a) => {
              const active = source === "manual" && a === area;
              return (
                <button
                  key={a}
                  onClick={() => {
                    setLocation({ area: a, coords: null, source: "manual" });
                    setFullAddr(null);
                    setStatus("idle");
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

          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-teal-50/70 p-3 text-[10px] font-medium leading-relaxed text-teal-700">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Lokasi GPS dipakai untuk menghitung jarak toko terdekat secara nyata. Data lokasi hanya
            tersimpan di perangkatmu.
          </p>
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
