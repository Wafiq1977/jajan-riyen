"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Package,
  ClipboardList,
  Wallet,
  BadgeCheck,
  Plus,
  Trash2,
  Store as StoreIcon,
  ChevronRight,
  CircleDollarSign,
  ShieldCheck,
  ScanLine,
  Settings2,
  QrCode,
  ImagePlus,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Order, Product, Store, User } from "@/lib/types";
import { formatRupiah, formatRupiahCompact, formatDateTime, maskPhone, discountPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StatusBadge, PaymentBadge, EmptyState, SkeletonList, Stars } from "../shared";
import { ImageUploader } from "../upload";
import { ScanDialog } from "../order-widgets";

const EMOJIS = ["🍽️", "🍛", "🧋", "☕", "🍰", "🍜", "🍔", "🍗", "🥟", "🍦", "🥞", "🍢", "🍚", "🧊", "🥤", "🌶️"];

export default function SellerDashboardScreen({
  user,
  onBack,
  onOpenStore,
  onUserRefreshed,
}: {
  user: User | null;
  onBack: () => void;
  onOpenStore: (storeId: string) => void;
  onUserRefreshed: (user: User) => void;
}) {
  const store = user?.store ?? null;
  const [tab, setTab] = useState<"orders" | "products" | "settings">("orders");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const load = useCallback(() => {
    if (!store) return;
    fetch(`/api/orders?storeId=${store.id}`)
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => setOrders([]));
    fetch(`/api/stores/${store.id}`)
      .then((r) => r.json())
      .then((d) => setProducts((d.store as Store | undefined)?.products ?? []))
      .catch(() => setProducts([]));
  }, [store]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const pending = orders?.filter((o) => o.status === "PENDING").length ?? 0;
    const processing = orders?.filter((o) => o.status === "PROCESSING").length ?? 0;
    const completed = orders?.filter((o) => o.status === "COMPLETED").length ?? 0;
    const revenue = orders
      ?.filter((o) => o.status !== "CANCELLED")
      .reduce((sum, o) => sum + o.totalPrice, 0) ?? 0;
    return { pending, processing, completed, revenue };
  }, [orders]);

  const updateOrderStatus = async (id: string, status: string) => {
    setOrders((cur) => cur?.map((o) => (o.id === id ? { ...o, status: status as Order["status"] } : o)) ?? cur);
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const deleteProduct = async (id: string) => {
    setProducts((cur) => cur?.filter((p) => p.id !== id) ?? cur);
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    load();
  };

  if (!store) {
    return (
      <div className="pt-6">
        <button onClick={onBack} className="press ml-4 flex items-center gap-1 text-sm font-bold text-primary">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>
        <EmptyState
          icon={StoreIcon}
          title="Kamu belum punya toko"
          description="Daftar jadi penjual dulu lewat menu Akun ya."
        />
      </div>
    );
  }

  return (
    <div>
      {/* Separate seller page header — dark, banner latar, logo toko */}
      <div className="relative overflow-hidden rounded-b-[2rem] bg-slate-900 px-5 pb-14 pt-6">
        {store.bannerUrl && (
          <img
            src={store.bannerUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
        )}
        <div
          className={cn(
            "absolute inset-0",
            store.bannerUrl ? "bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/60" : ""
          )}
        />
        <motion.div
          className="absolute -left-10 -bottom-14 h-40 w-40 rounded-full bg-teal-400/15"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative z-10 flex items-center justify-between">
          <button
            onClick={onBack}
            className="press flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
            aria-label="Kembali ke akun"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="flex items-center gap-1.5 rounded-full bg-teal-400/15 px-3 py-1.5 text-[10px] font-black tracking-wide text-teal-300 ring-1 ring-teal-400/30">
            <ShieldCheck className="h-3.5 w-3.5" /> MODE PENJUAL
          </span>
        </div>
        <div className="relative z-10 mt-4 flex items-center gap-3">
          <div className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-2xl bg-white shadow-lg">
            {store.logoUrl ? (
              <img src={store.logoUrl} alt={`Logo ${store.name}`} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl">
                {store.category === "Minuman" ? "🧋" : store.category === "Dessert" ? "🍰" : "🍛"}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-300">Dashboard Penjual</p>
            <h1 className="truncate text-lg font-extrabold leading-tight text-white">{store.name}</h1>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/60">
              <Stars rating={store.rating} className="text-amber-300" />
              <span>· {store.category}</span>
            </div>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-emerald-400/90 px-2.5 py-1 text-[10px] font-extrabold text-emerald-950">
            ● BUKA
          </span>
        </div>
        <button
          onClick={() => onOpenStore(store.id)}
          className="press relative z-10 mt-4 flex w-full items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-xs font-bold text-white backdrop-blur"
        >
          <span>👀 Lihat etalase tokomu (tampilan pembeli)</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="relative z-10 -mt-8 px-5">
        <div className="grid grid-cols-4 gap-2">
          <StatCard icon={<Package className="h-4 w-4" />} value={products?.length ?? "…"} label="Produk" tone="bg-teal-50 text-teal-600" />
          <StatCard icon={<ClipboardList className="h-4 w-4" />} value={stats.pending} label="Baru" tone="bg-amber-50 text-amber-600" alert={stats.pending > 0} />
          <StatCard icon={<BadgeCheck className="h-4 w-4" />} value={stats.completed} label="Selesai" tone="bg-emerald-50 text-emerald-600" />
          <StatCard icon={<Wallet className="h-4 w-4" />} value={formatRupiahCompact(stats.revenue).replace("Rp", "")} label="Omzet (Rp)" tone="bg-violet-50 text-violet-600" small />
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5 px-5">
        <div className="flex rounded-2xl bg-muted p-1">
          {(["orders", "products", "settings"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "relative flex-1 rounded-xl py-2.5 text-xs font-extrabold transition-colors",
                tab === t ? "text-primary" : "text-slate-400"
              )}
            >
              {tab === t && (
                <motion.span
                  layoutId="seller-tab"
                  className="absolute inset-0 rounded-xl bg-white shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10">
                {t === "orders" ? `Pesanan (${stats.pending + stats.processing})` : t === "products" ? `Produk (${products?.length ?? 0})` : "Toko"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mt-4 px-5 pb-4">
        {tab === "orders" ? (
          !orders ? (
            <SkeletonList count={3} />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Belum ada pesanan masuk"
              description="Promosikan tokomu agar dibeli lebih banyak orang!"
            />
          ) : (
            <div className="space-y-3">
              {/* Scan barcode pembeli */}
              <button
                onClick={() => setScanOpen(true)}
                className="press flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/50 px-4 py-3 text-left hover:bg-teal-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
                  <ScanLine className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-extrabold text-foreground">Scan Barcode Pembeli</span>
                  <span className="block text-[10px] text-muted-foreground">
                    Pindai barcode pesanan untuk konfirmasi cepat
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>

              {orders.map((order, idx) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.25) }}
                  className="rounded-3xl border border-teal-50 bg-white p-4 card-soft"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-slate-400">{order.code}</span>
                    <StatusBadge status={order.status} />
                  </div>

                  {/* Multi items */}
                  <div
                    className={cn(
                      "mt-2.5 space-y-1",
                      order.items.length > 3 && "max-h-40 overflow-y-auto pretty-scroll pr-1"
                    )}
                  >
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2.5 rounded-xl bg-slate-50/70 px-2.5 py-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-sm">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            item.emoji
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-bold text-foreground">{item.name}</p>
                          <p className="text-[9px] text-muted-foreground">
                            {formatRupiah(item.price)} × {item.quantity}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-extrabold text-slate-500">
                          {formatRupiah(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <PaymentBadge method={order.paymentMethod} />
                      <span className="text-[9px] font-semibold text-slate-400">
                        {maskPhone(order.user?.phone ?? "-")} · {formatDateTime(order.createdAt)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-semibold text-slate-400">
                        Total · {order.quantity} item
                      </p>
                      <p className="text-sm font-extrabold text-primary">{formatRupiah(order.totalPrice)}</p>
                    </div>
                  </div>

                  {order.status === "PENDING" && (
                    <Button
                      onClick={() => updateOrderStatus(order.id, "PROCESSING")}
                      className="press mt-3 h-9 w-full rounded-xl bg-primary text-xs font-extrabold shadow-md shadow-teal-500/25 hover:bg-teal-700"
                    >
                      ✅ Terima Pesanan
                    </Button>
                  )}
                  {order.status === "PROCESSING" && (
                    <Button
                      onClick={() => updateOrderStatus(order.id, "COMPLETED")}
                      className="press mt-3 h-9 w-full rounded-xl bg-emerald-500 text-xs font-extrabold shadow-md shadow-emerald-500/25 hover:bg-emerald-600"
                    >
                      🎉 Tandai Selesai
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
          )
        ) : tab === "products" ? (
          !products ? (
            <SkeletonList count={3} />
          ) : products.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Belum ada produk"
              description="Tambahkan menu pertamamu sekarang!"
              action={<AddProductDialog storeId={store.id} onCreated={load} />}
            />
          ) : (
            <div className="space-y-3">
              {products.map((p, idx) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.25) }}
                  className="flex items-center gap-3 rounded-3xl border border-teal-50 bg-white p-3.5 card-soft"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-teal-50 text-xl">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      p.emoji
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-xs font-extrabold text-foreground">{p.name}</h3>
                    <div className="mt-0.5 flex items-baseline gap-1.5">
                      <span className="text-xs font-extrabold text-primary">{formatRupiah(p.price)}</span>
                      {discountPercent(p.price, p.originalPrice) && (
                        <span className="text-[9px] font-medium text-slate-400 line-through">
                          {formatRupiah(p.originalPrice!)}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                      stok {p.stock} · {p.sold.toLocaleString("id-ID")} terjual {p.isFlashSale ? "· ⚡ flash" : ""}
                    </p>
                  </div>
                  <DeleteProductButton onDelete={() => deleteProduct(p.id)} name={p.name} />
                </motion.div>
              ))}
              <AddProductDialog storeId={store.id} onCreated={load} block />
            </div>
          )
        ) : (
          <StoreSettingsTab store={store} onUserRefreshed={onUserRefreshed} />
        )}
      </div>

      {/* Scan dialog (seller mode) */}
      <ScanDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        sellerStoreId={store.id}
        onOrderUpdated={load}
      />
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  tone,
  alert,
  small,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  tone: string;
  alert?: boolean;
  small?: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center rounded-2xl border border-teal-50 bg-white py-3 card-soft">
      <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", tone)}>{icon}</span>
      <span className={cn("mt-1.5 max-w-full truncate px-1 font-extrabold text-foreground", small ? "text-xs" : "text-base")}>
        {value}
      </span>
      <span className="text-[9px] font-bold text-muted-foreground">{label}</span>
      {alert && (
        <motion.span
          className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}
    </div>
  );
}

function DeleteProductButton({ onDelete, name }: { onDelete: () => void; name: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-500"
          aria-label={`Hapus ${name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-[400px] rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus produk ini?</AlertDialogTitle>
          <AlertDialogDescription>
            “{name}” akan dihapus dari tokomu. Produk dengan riwayat pesanan tidak dapat dihapus.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} className="rounded-xl bg-red-500 hover:bg-red-600">
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ------------------------------------------------------------------ */
/* AddProductDialog — dengan upload foto produk                        */
/* ------------------------------------------------------------------ */

function AddProductDialog({
  storeId,
  onCreated,
  block,
}: {
  storeId: string;
  onCreated: () => void;
  block?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [stock, setStock] = useState("50");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🍽️");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setPrice("");
    setOriginalPrice("");
    setStock("50");
    setDescription("");
    setEmoji("🍽️");
    setImageUrl(null);
    setFlash(false);
    setError(null);
  };

  const submit = async () => {
    const priceNum = parseInt(price.replace(/\D/g, ""), 10);
    if (!name.trim() || !priceNum || priceNum < 100) {
      setError("Nama produk & harga (min Rp100) wajib diisi");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const origNum = parseInt(originalPrice.replace(/\D/g, ""), 10);
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          name,
          description,
          price: priceNum,
          originalPrice: origNum || null,
          stock: parseInt(stock, 10) || 0,
          emoji,
          imageUrl,
          isFlashSale: flash,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambah produk");
      reset();
      setOpen(false);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menambah produk");
    } finally {
      setLoading(false);
    }
  };

  const priceValid = parseInt(price.replace(/\D/g, ""), 10) >= 100;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {block ? (
          <Button className="press h-12 w-full rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/50 text-sm font-extrabold text-primary shadow-none hover:bg-teal-50">
            <Plus className="mr-1.5 h-4 w-4" /> Tambah Produk Baru
          </Button>
        ) : (
          <Button className="press h-11 w-full rounded-2xl bg-primary text-sm font-extrabold shadow-lg shadow-teal-500/30 hover:bg-teal-700">
            <Plus className="mr-1.5 h-4 w-4" /> Tambah Produk Pertama
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-[420px] overflow-y-auto rounded-3xl pretty-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-primary">
              <CircleDollarSign className="h-4 w-4" />
            </span>
            Produk Baru
          </DialogTitle>
          <DialogDescription className="text-left">
            Isi detail produk yang mau dijual di tokomu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5">
          {/* Foto produk */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold">
              <ImagePlus className="h-3.5 w-3.5 text-primary" /> Foto Produk
            </label>
            <ImageUploader
              value={imageUrl}
              onChange={setImageUrl}
              variant="image"
              label="Unggah foto produk"
              hint="JPG/PNG, maks 5MB — tampil di etalase pembeli"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold">Emoji Produk</label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={cn(
                    "press flex h-9 w-9 items-center justify-center rounded-xl border-2 text-lg transition-all",
                    emoji === e ? "border-primary bg-teal-50" : "border-transparent bg-muted/50 hover:bg-muted"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-slate-400">Dipakai sebagai ikon cadangan bila foto tidak diunggah.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold">Nama Produk *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 60))}
              placeholder="cth: Es Kopi Susu Gula Aren"
              className="h-11 rounded-xl bg-muted/30 text-sm font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold">Harga Jual *</label>
              <Input
                inputMode="numeric"
                value={price ? parseInt(price.replace(/\D/g, "") || "0", 10).toLocaleString("id-ID") : ""}
                onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="15000"
                className="h-11 rounded-xl bg-muted/30 text-sm font-semibold"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold">Harga Asli</label>
              <Input
                inputMode="numeric"
                value={originalPrice ? parseInt(originalPrice.replace(/\D/g, "") || "0", 10).toLocaleString("id-ID") : ""}
                onChange={(e) => setOriginalPrice(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="opsional"
                className="h-11 rounded-xl bg-muted/30 text-sm font-semibold"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold">Stok</label>
              <Input
                inputMode="numeric"
                value={stock}
                onChange={(e) => setStock(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="mt-1.5 h-10 w-24 rounded-xl bg-muted/30 text-center text-sm font-semibold"
              />
            </div>
            <div className="flex items-center gap-2.5">
              <div className="text-right">
                <label className="text-xs font-bold">⚡ Flash Sale</label>
                <p className="text-[10px] text-muted-foreground">Tampil di beranda</p>
              </div>
              <Switch checked={flash} onCheckedChange={setFlash} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold">Deskripsi</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 160))}
              placeholder="Deskripsi singkat produk…"
              className="min-h-[64px] resize-none rounded-xl bg-muted/30 text-sm"
            />
          </div>

          {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

          <Button
            onClick={submit}
            disabled={loading || !priceValid || !name.trim()}
            className="press h-12 w-full rounded-2xl bg-primary text-sm font-extrabold shadow-lg shadow-teal-500/30 hover:bg-teal-700 disabled:opacity-40"
          >
            {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : "Simpan Produk"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* StoreSettingsTab — QRIS (opsional) + logo & banner                  */
/* ------------------------------------------------------------------ */

function StoreSettingsTab({
  store,
  onUserRefreshed,
}: {
  store: Store;
  onUserRefreshed: (user: User) => void;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(store.logoUrl);
  const [bannerUrl, setBannerUrl] = useState<string | null>(store.bannerUrl);
  const [qrisEnabled, setQrisEnabled] = useState(store.qrisEnabled);
  const [qrisImageUrl, setQrisImageUrl] = useState<string | null>(store.qrisImageUrl);
  const [qrisCode, setQrisCode] = useState(store.qrisCode ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/seller/store", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id,
          logoUrl,
          bannerUrl,
          qrisEnabled,
          qrisImageUrl,
          qrisCode: qrisCode.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      if (data.user) onUserRefreshed(data.user as User);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Pengaturan QRIS */}
      <div className="rounded-3xl border border-violet-100 bg-gradient-to-b from-violet-50/60 to-white p-4 card-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <QrCode className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-xs font-extrabold text-foreground">Pembayaran QRIS (opsional)</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                Aktifkan agar pembeli bisa bayar tanpa uang pas. Unggah gambar QRIS-mu (dari bank/e-wallet)
                atau tulis kode merchant.
              </p>
            </div>
          </div>
          <Switch
            checked={qrisEnabled}
            onCheckedChange={(v) => {
              setError(null);
              setQrisEnabled(v);
            }}
          />
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-violet-50/70 p-3 text-[10px] font-medium leading-relaxed text-violet-700">
          🔳 Isi gambar/kode QRIS dulu, lalu aktifkan sakelar di atas agar pembeli bisa memilih QRIS saat checkout.
        </div>

        <div className="mt-3 space-y-3.5 border-t border-dashed border-violet-100 pt-4">
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs font-bold">Gambar Kode QRIS</p>
            <ImageUploader
              value={qrisImageUrl}
              onChange={setQrisImageUrl}
              variant="qris"
              label="Unggah gambar QRIS"
              hint="Potongan QRIS dari aplikasi bank / e-wallet"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold" htmlFor="qris-code">
              Kode QRIS / NMID Merchant
            </label>
            <Input
              id="qris-code"
              value={qrisCode}
              onChange={(e) => setQrisCode(e.target.value.slice(0, 32))}
              placeholder="cth: ID10203340056781"
              className="h-11 rounded-xl bg-muted/30 font-mono text-sm font-semibold tracking-wider"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              Kode ini tampil di bawah QRIS saat pembeli checkout.
            </p>
          </div>
        </div>
      </div>

      {/* Logo & banner */}
      <div className="rounded-3xl border border-teal-50 bg-white p-4 card-soft">
        <p className="flex items-center gap-1.5 text-xs font-extrabold text-foreground">
          <ImagePlus className="h-4 w-4 text-primary" /> Logo &amp; Banner Toko
        </p>
        <div className="mt-3 flex items-start gap-4">
          <div>
            <p className="mb-1.5 text-xs font-bold">Logo</p>
            <ImageUploader value={logoUrl} onChange={setLogoUrl} variant="logo" label="Unggah logo" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-xs font-bold">Banner latar</p>
            <ImageUploader value={bannerUrl} onChange={setBannerUrl} variant="banner" label="Unggah banner" />
          </div>
        </div>
        <p className="mt-2.5 text-[10px] text-slate-400">
          Banner tampil di belakang nama toko (halaman toko &amp; dashboard).
        </p>
      </div>

      {error && <p className="text-center text-xs font-semibold text-red-500">{error}</p>}

      <Button
        onClick={save}
        disabled={saving}
        className={cn(
          "press h-12 w-full rounded-2xl text-sm font-extrabold shadow-lg shadow-teal-500/30",
          saved ? "bg-emerald-500 hover:bg-emerald-600" : "bg-primary hover:bg-teal-700"
        )}
      >
        {saving ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : saved ? (
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> Tersimpan!
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Settings2 className="h-4 w-4" /> Simpan Pengaturan Toko
          </span>
        )}
      </Button>
    </div>
  );
}
