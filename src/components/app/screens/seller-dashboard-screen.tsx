"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Package,
  ClipboardList,
  Wallet,
  BadgeCheck,
  Plus,
  Trash2,
  Loader2,
  Store as StoreIcon,
  ChevronRight,
  CircleDollarSign,
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
import { formatRupiah, formatDateTime, maskPhone, discountPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ProductThumb, StatusBadge, PaymentBadge, EmptyState, SkeletonList, Stars } from "../shared";

const EMOJIS = ["🍽️", "🍛", "🧋", "☕", "🍰", "🍜", "🍔", "🍗", "🥟", "🍦", "🥞", "🍢", "🍚", "🧊", "🥤", "🌶️"];

export default function SellerDashboardScreen({
  user,
  onOpenStore,
}: {
  user: User | null;
  onOpenStore: (storeId: string) => void;
}) {
  const store = user?.store ?? null;
  const [tab, setTab] = useState<"orders" | "products">("orders");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);

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
      <EmptyState
        icon={StoreIcon}
        title="Kamu belum punya toko"
        description="Daftar jadi penjual dulu lewat menu Akun ya."
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="relative bg-brand-gradient px-5 pb-14 pt-6 rounded-b-[2rem] overflow-hidden">
        <motion.div
          className="absolute -left-10 -bottom-14 h-40 w-40 rounded-full bg-white/10"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-13 w-13 h-[52px] w-[52px] items-center justify-center rounded-2xl bg-white text-2xl shadow-lg">
              {store.category === "Minuman" ? "🧋" : store.category === "Dessert" ? "🍰" : "🍛"}
            </div>
            <div>
              <h1 className="text-lg font-extrabold leading-tight text-white">{store.name}</h1>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-teal-50/90">
                <Stars rating={store.rating} className="text-amber-300" />
                <span>· {store.category}</span>
              </div>
            </div>
          </div>
          <span className="rounded-full bg-emerald-400/90 px-2.5 py-1 text-[10px] font-extrabold text-emerald-950">
            ● BUKA
          </span>
        </div>
        <button
          onClick={() => onOpenStore(store.id)}
          className="press relative z-10 mt-4 flex w-full items-center justify-between rounded-2xl bg-white/12 bg-white/15 px-4 py-3 text-xs font-bold text-white backdrop-blur"
        >
          <span>👀 Lihat tampilan tokomu di pembeli</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="relative -mt-8 z-10 px-5">
        <div className="grid grid-cols-4 gap-2.5">
          <StatCard icon={<Package className="h-4 w-4" />} value={products?.length ?? "…"} label="Produk" tone="bg-teal-50 text-teal-600" />
          <StatCard icon={<ClipboardList className="h-4 w-4" />} value={stats.pending} label="Baru" tone="bg-amber-50 text-amber-600" alert={stats.pending > 0} />
          <StatCard icon={<BadgeCheck className="h-4 w-4" />} value={stats.completed} label="Selesai" tone="bg-emerald-50 text-emerald-600" />
          <StatCard icon={<Wallet className="h-4 w-4" />} value={formatRupiah(stats.revenue).replace("Rp", "")} label="Pendapatan" tone="bg-violet-50 text-violet-600" small />
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5 px-5">
        <div className="flex rounded-2xl bg-muted p-1">
          {(["orders", "products"] as const).map((t) => (
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
              <span className="relative z-10">{t === "orders" ? `Pesanan (${stats.pending + stats.processing})` : `Produk (${products?.length ?? 0})`}</span>
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
                  <div className="mt-2.5 flex gap-3">
                    <ProductThumb product={order.product} className="h-12 w-12 shrink-0" rounded="rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-xs font-extrabold text-foreground">{order.product.name}</h3>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {order.quantity}× · {maskPhone(order.user?.phone ?? "-")}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <PaymentBadge method={order.paymentMethod} />
                        <span className="text-[9px] font-semibold text-slate-400">{formatDateTime(order.createdAt)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-semibold text-slate-400">Total</p>
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
        ) : !products ? (
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
                <ProductThumb product={p} className="h-14 w-14 shrink-0" rounded="rounded-xl" />
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
        )}
      </div>
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
      <DialogContent className="max-w-[420px] rounded-3xl max-h-[85vh] overflow-y-auto pretty-scroll">
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
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Simpan Produk"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
