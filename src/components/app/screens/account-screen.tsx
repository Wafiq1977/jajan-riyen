"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Store,
  ReceiptText,
  HelpCircle,
  Info,
  LogOut,
  BadgeCheck,
  Sparkles,
  Package,
  Loader2,
  CircleUserRound,
  LayoutDashboard,
  ShoppingCart,
  Smartphone,
  Share2,
  Download,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Order, User } from "@/lib/types";
import { maskPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BrandWordmark } from "../brand";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AccountScreen({
  user,
  ordersTick,
  onGoTab,
  onSellerForm,
  onSellerDashboard,
  onOpenStore,
  onLoggedOut,
}: {
  user: User | null;
  ordersTick: number;
  onGoTab: (name: string) => void;
  onSellerForm: () => void;
  onSellerDashboard: () => void;
  onOpenStore: (storeId: string) => void;
  onLoggedOut: () => void;
}) {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetch(`/api/orders?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => alive && setOrders(data.orders ?? []))
      .catch(() => alive && setOrders([]));
    return () => {
      alive = false;
    };
  }, [user, ordersTick]);

  if (!user) return null;

  const totalOrders = orders?.length ?? 0;
  const processing = orders?.filter((o) => o.status === "PENDING" || o.status === "PROCESSING").length ?? 0;
  const completed = orders?.filter((o) => o.status === "COMPLETED").length ?? 0;

  return (
    <div>
      {/* Profile header */}
      <div className="relative overflow-hidden rounded-b-[2rem] bg-brand-gradient px-5 pb-16 pt-8">
        <motion.div
          className="absolute -left-10 -top-14 h-44 w-44 rounded-full bg-white/10"
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative z-10 flex items-center justify-between">
          <BrandWordmark light size="sm" />
          <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold text-white backdrop-blur">
            {user.isSeller ? "Pembeli · Penjual" : "Pembeli"}
          </span>
        </div>
        <div className="relative z-10 mt-5 flex items-center gap-3.5">
          {/* Person icon avatar */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg">
            <CircleUserRound className="h-11 w-11 text-primary" strokeWidth={1.6} />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-teal-950 ring-2 ring-teal-600">
              ✓
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold text-white">Halo, {maskPhone(user.phone)} 👋</h1>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-teal-50/85">
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              ID: {user.id.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="relative z-10 -mt-10 px-5">
        <div className="grid grid-cols-3 divide-x divide-teal-50 rounded-3xl border border-teal-50 bg-white py-4 card-soft">
          <Stat value={totalOrders} label="Total Pesanan" />
          <Stat value={processing} label="Berjalan" />
          <Stat value={completed} label="Selesai" />
        </div>
      </div>

      {/* Seller CTA / separate dashboard menu */}
      <div className="mt-4 px-5">
        {!user.isSeller ? (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onSellerForm}
            className="press relative w-full overflow-hidden rounded-3xl bg-brand-gradient p-5 text-left shadow-xl shadow-teal-500/25"
          >
            <motion.span
              className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <div className="relative z-10 flex items-center gap-3.5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur">
                <Store className="h-6 w-6" />
              </span>
              <div className="flex-1">
                <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-white">
                  Buka Toko di JajanRiyen <Sparkles className="h-4 w-4 text-amber-300" />
                </h3>
                <p className="mt-0.5 text-[11px] leading-relaxed text-teal-50/90">
                  Gratis! Daftar penjual &amp; dashboard toko langsung aktif otomatis.
                </p>
              </div>
              <span className="rounded-full bg-white px-3.5 py-2 text-xs font-extrabold text-primary">
                Daftar
              </span>
            </div>
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onSellerDashboard}
            className="press relative w-full overflow-hidden rounded-3xl bg-slate-900 p-5 text-left shadow-xl shadow-slate-900/25"
          >
            <motion.span
              className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-teal-400/20"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <div className="relative z-10 flex items-center gap-3.5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-400/20 text-teal-300 backdrop-blur">
                <LayoutDashboard className="h-6 w-6" />
              </span>
              <div className="flex-1">
                <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-white">
                  Dashboard Penjual
                  <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[9px] font-black text-emerald-300">
                    MODE PENJUAL
                  </span>
                </h3>
                <p className="mt-0.5 truncate text-[11px] text-teal-50/70">
                  {user.store?.name ?? "Toko kamu"} · aktif ✓
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-white/80" />
            </div>
          </motion.button>
        )}
      </div>

      {/* Menu */}
      <div className="mt-4 px-5">
        <div className="divide-y divide-border/60 rounded-3xl border border-teal-50 bg-white card-soft">
          <MenuItem
            icon={<ShoppingCart className="h-[18px] w-[18px]" />}
            label="Keranjang Belanja"
            onClick={() => onGoTab("cart")}
          />
          <MenuItem icon={<ReceiptText className="h-[18px] w-[18px]" />} label="Pesanan Saya" onClick={() => onGoTab("orders")} />
          {user.isSeller && user.store && (
            <MenuItem
              icon={<Package className="h-[18px] w-[18px]" />}
              label="Lihat Toko Saya"
              onClick={() => onOpenStore(user.store!.id)}
            />
          )}
          {user.isSeller && (
            <MenuItem
              icon={<LayoutDashboard className="h-[18px] w-[18px]" />}
              label="Buka Dashboard Penjual"
              onClick={onSellerDashboard}
            />
          )}
          <HelpDialog />
          <InstallAppDialog />
          <AboutDialog />
          <LogoutDialog onLogout={onLoggedOut} />
        </div>
        <p className="mt-6 text-center text-[10px] text-slate-400">Jajan Riyen v2.0.0 · dibuat dengan 💚</p>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      {value === null ? (
        <Loader2 className="h-5 w-5 animate-spin text-teal-300" />
      ) : (
        <span className="text-xl font-extrabold text-primary">{value}</span>
      )}
      <span className="mt-0.5 text-[10px] font-semibold text-muted-foreground">{label}</span>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="press flex w-full items-center gap-3.5 px-4 py-4 text-left hover:bg-teal-50/40"
    >
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", danger ? "bg-red-50 text-red-500" : "bg-teal-50 text-primary")}>
        {icon}
      </span>
      <span className={cn("flex-1 text-sm font-bold", danger ? "text-red-500" : "text-foreground")}>{label}</span>
      <ChevronRight className={cn("h-4 w-4", danger ? "text-red-300" : "text-slate-300")} />
    </button>
  );
}

function HelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="press flex w-full items-center gap-3.5 px-4 py-4 text-left hover:bg-teal-50/40">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-primary">
            <HelpCircle className="h-[18px] w-[18px]" />
          </span>
          <span className="flex-1 text-sm font-bold text-foreground">Pusat Bantuan</span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[400px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-left">Pusat Bantuan</DialogTitle>
          <DialogDescription className="text-left">
            Pertanyaan yang sering diajukan pengguna Jajan Riyen.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-xs leading-relaxed">
          <div>
            <p className="font-extrabold text-foreground">Bagaimana cara menjadi penjual?</p>
            <p className="mt-1 text-muted-foreground">
              Buka tab <b>Akun → Buka Toko di JajanRiyen</b>, isi nama toko dan deskripsi. Dashboard penjual
              langsung aktif otomatis setelah daftar, di halaman terpisah.
            </p>
          </div>
          <div>
            <p className="font-extrabold text-foreground">Bagaimana cara pesan banyak menu sekaligus?</p>
            <p className="mt-1 text-muted-foreground">
              Tekan tombol <b>+</b> di etalase toko untuk memasukkan item ke Keranjang. Semua item dari UMKM
              yang sama dibayar sekali transaksi. Pesanan antar UMKM selalu dipisah.
            </p>
          </div>
          <div>
            <p className="font-extrabold text-foreground">Metode pembayaran apa saja yang tersedia?</p>
            <p className="mt-1 text-muted-foreground">
              Saat ini tersedia <b>Tunai</b> (bayar di tempat) dan <b>QRIS</b> (scan semua e-wallet &amp; m-banking).
            </p>
          </div>
          <div>
            <p className="font-extrabold text-foreground">Bisa membatalkan pesanan?</p>
            <p className="mt-1 text-muted-foreground">
              Bisa, selama pesanan masih berstatus <b>Menunggu Konfirmasi</b>. Buka tab Pesanan lalu tekan Batalkan.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InstallAppDialog() {
  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    const check = () => setInstallable(Boolean((window as unknown as { __jrInstallPrompt?: Event }).__jrInstallPrompt));
    check();
    window.addEventListener("jr:installable", check);
    return () => window.removeEventListener("jr:installable", check);
  }, []);

  const promptInstall = async () => {
    const evt = (window as unknown as { __jrInstallPrompt?: (prompt: () => Promise<void>) => void }).__jrInstallPrompt;
    if (evt && typeof (evt as unknown as { prompt?: () => Promise<void> }).prompt === "function") {
      await (evt as unknown as { prompt: () => Promise<void> }).prompt();
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="press flex w-full items-center gap-3.5 px-4 py-4 text-left hover:bg-teal-50/40">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-primary">
            <Smartphone className="h-[18px] w-[18px]" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-bold text-foreground">Install Aplikasi di HP</span>
            <span className="block text-[10px] font-medium text-muted-foreground">
              {installable ? "Tersedia — pasang seperti aplikasi asli" : "Tambahkan ke layar utama (PWA)"}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[400px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-left">Pasang Jajan Riyen 📲</DialogTitle>
          <DialogDescription className="text-left">
            Pasang aplikasi langsung dari browser — tanpa Play Store. Buka Jajan Riyen seperti aplikasi
            asli dengan logo di layar utamamu.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {installable && (
            <button
              onClick={promptInstall}
              className="press flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient text-sm font-extrabold text-white shadow-lg shadow-teal-500/30"
            >
              <Download className="h-4 w-4" /> Pasang Sekarang
            </button>
          )}
          <div className="rounded-2xl border border-teal-50 bg-teal-50/40 p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-teal-700">
              <Share2 className="h-3.5 w-3.5" /> Android (Chrome)
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-teal-900/80">
              Ketuk menu <b>⋮</b> di pojok kanan atas → <b>“Tambahkan ke layar utama”</b> → Install.
            </p>
          </div>
          <div className="rounded-2xl border border-teal-50 bg-teal-50/40 p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-teal-700">
              <Share2 className="h-3.5 w-3.5" /> iPhone (Safari)
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-teal-900/80">
              Ketuk tombol <b>Bagikan</b> (kotak dengan panah) → <b>“Tambahkan ke Layar Utama”</b>.
            </p>
          </div>
          <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
            Ingin APK untuk dibagikan / masuk Play Store? Ikuti langkah PWABuilder di
            <b> PANDUAN-DEPLOY.md</b>.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AboutDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="press flex w-full items-center gap-3.5 px-4 py-4 text-left hover:bg-teal-50/40">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-primary">
            <Info className="h-[18px] w-[18px]" />
          </span>
          <span className="flex-1 text-sm font-bold text-foreground">Tentang JajanRiyen</span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[400px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-left">Tentang Jajan Riyen 🌿</DialogTitle>
          <DialogDescription className="text-left">
            Jajan Riyen (JR) adalah marketplace jajan lokal yang menghubungkan pembeli dengan UMKM kuliner di
            sekitar. Sederhana, cepat, dan ramah — jajan pakai tunai atau QRIS.
          </DialogDescription>
        </DialogHeader>
        <ul className="list-inside list-disc space-y-1.5 text-xs text-muted-foreground">
          <li>Login mudah hanya dengan nomor telepon</li>
          <li>Semua pengguna otomatis berstatus pembeli</li>
          <li>Keranjang per UMKM — banyak menu, satu transaksi</li>
          <li>Daftar penjual gratis, dashboard halaman tersendiri</li>
          <li>Bayar tunai di tempat atau scan QRIS</li>
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function LogoutDialog({ onLogout }: { onLogout: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="press flex w-full items-center gap-3.5 px-4 py-4 text-left hover:bg-red-50/40">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500">
            <LogOut className="h-[18px] w-[18px]" />
          </span>
          <span className="flex-1 text-sm font-bold text-red-500">Keluar</span>
          <ChevronRight className="h-4 w-4 text-red-300" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-[400px] rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Keluar dari Jajan Riyen?</AlertDialogTitle>
          <AlertDialogDescription>
            Kamu perlu login ulang dengan nomor telepon untuk jajan lagi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={onLogout}
            className="rounded-xl bg-red-500 hover:bg-red-600"
          >
            Ya, Keluar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
