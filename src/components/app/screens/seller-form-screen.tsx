"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Store,
  Rocket,
  PackagePlus,
  BarChart3,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { User } from "@/lib/types";

const CATEGORIES = [
  { value: "Makanan", emoji: "🍛" },
  { value: "Minuman", emoji: "🧋" },
  { value: "Dessert", emoji: "🍰" },
];

const BENEFITS = [
  { icon: Store, title: "Toko online gratis", desc: "Etalase produkmu tampil ke semua pembeli Jajan Riyen" },
  { icon: PackagePlus, title: "Kelola menu mudah", desc: "Tambah produk, atur stok & harga dalam sekali klik" },
  { icon: BarChart3, title: "Dashboard tersendiri", desc: "Halaman penjual terpisah dari akun pembeli" },
];

export default function SellerFormScreen({
  user,
  onBack,
  onDone,
}: {
  user: User | null;
  onBack: () => void;
  onDone: (user: User) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Makanan");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!user || !name.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/seller/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          name,
          category,
          description,
          address,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mendaftar");
      onDone(data.user as User);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mendaftar");
      setLoading(false);
    }
  };

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="relative bg-brand-gradient px-5 pb-12 pt-5 rounded-b-[2rem] overflow-hidden">
        <motion.div
          className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative z-10">
          <button
            onClick={onBack}
            className="press flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="mt-4 text-2xl font-extrabold text-white">Daftar Jadi Penjual 🚀</h1>
          <p className="mt-1 text-xs text-teal-50/90">
            Gratis 100%. Dashboard toko langsung aktif otomatis setelah mendaftar.
          </p>
        </div>
      </div>

      {/* Benefits */}
      <div className="relative -mt-6 z-10 px-5">
        <div className="rounded-3xl border border-teal-50 bg-white p-4 card-soft">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`flex items-start gap-3 py-2 ${i > 0 ? "border-t border-dashed border-border" : ""}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-primary">
                <b.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-extrabold text-foreground">{b.title}</p>
                <p className="text-[11px] text-muted-foreground">{b.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="mt-4 px-5">
        <h2 className="mb-2.5 text-sm font-extrabold">Data Toko</h2>
        <div className="space-y-3.5 rounded-3xl border border-teal-50 bg-white p-4 card-soft">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-foreground" htmlFor="store-name">
              Nama Toko <span className="text-red-400">*</span>
            </label>
            <Input
              id="store-name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 40))}
              placeholder="cth: Warung Makan Barokah"
              className="h-11 rounded-xl border-input bg-muted/30 text-sm font-semibold"
              maxLength={40}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-foreground">
              Kategori Usaha <span className="text-red-400">*</span>
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11 w-full rounded-xl border-input bg-muted/30 text-sm font-semibold">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.emoji} {c.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-foreground" htmlFor="store-desc">
              Deskripsi Toko
            </label>
            <Textarea
              id="store-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 160))}
              placeholder="Ceritakan singkat tentang usahamu…"
              className="min-h-[76px] resize-none rounded-xl border-input bg-muted/30 text-sm"
              maxLength={160}
            />
            <p className="mt-1 text-right text-[10px] text-slate-400">{description.length}/160</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-foreground" htmlFor="store-addr">
              Alamat Toko
            </label>
            <Input
              id="store-addr"
              value={address}
              onChange={(e) => setAddress(e.target.value.slice(0, 120))}
              placeholder="cth: Jl. Merdeka No. 12"
              className="h-11 rounded-xl border-input bg-muted/30 text-sm font-semibold"
              maxLength={120}
            />
          </div>
        </div>

        {error && <p className="mt-3 text-center text-xs font-semibold text-red-500">{error}</p>}

        <Button
          onClick={submit}
          disabled={!name.trim() || loading}
          className="press mt-5 h-13 h-[52px] w-full rounded-2xl bg-primary text-base font-extrabold shadow-xl shadow-teal-500/30 hover:bg-teal-700 disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <span className="inline-flex items-center gap-2">
              <Rocket className="h-4.5 w-4.5 h-[18px] w-[18px]" />
              Aktifkan Toko Sekarang
            </span>
          )}
        </Button>

        <div className="mt-4 flex items-start justify-center gap-1.5 text-center text-[11px] leading-relaxed text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          Setelah aktif, <b className="mx-0.5 text-primary">Dashboard Penjual</b> otomatis muncul di menu Akun.
        </div>
      </div>
    </div>
  );
}
