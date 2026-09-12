"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Receipt, Copy, PartyPopper, QrCode } from "lucide-react";
import type { Order } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Barcode } from "../order-widgets";

export default function SuccessScreen({
  orderId,
  onDone,
}: {
  orderId: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/orders/${orderId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data?.order) setOrder(data.order as Order);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [orderId]);

  const confetti = Array.from({ length: 14 });
  const code = order?.code ?? "······";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-10">
      {/* confetti */}
      {confetti.map((_, i) => (
        <motion.span
          key={i}
          className="absolute top-[16%] h-2.5 w-2.5 rounded-[3px]"
          style={{
            left: `${8 + i * 6.2}%`,
            background: ["#14b8a6", "#2dd4bf", "#fbbf24", "#f97316", "#a78bfa"][i % 5],
          }}
          initial={{ y: -40, opacity: 0, rotate: 0 }}
          animate={{ y: 320 + (i % 4) * 40, opacity: [0, 1, 1, 0], rotate: 360 }}
          transition={{ duration: 2.2 + (i % 3) * 0.4, delay: 0.2 + (i % 5) * 0.12, ease: "easeIn" }}
        />
      ))}

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 shadow-2xl shadow-teal-500/40"
      >
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.25, type: "spring", stiffness: 300, damping: 14 }}
        >
          <Check className="h-12 w-12 text-white" strokeWidth={3} />
        </motion.span>
        <motion.span
          className="absolute inset-0 rounded-full border-4 border-teal-200"
          animate={{ scale: [1, 1.35], opacity: [0.8, 0] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      </motion.div>

      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 text-center"
      >
        <h1 className="flex items-center justify-center gap-2 text-2xl font-extrabold">
          Pesanan Berhasil! <PartyPopper className="h-6 w-6 text-amber-500" />
        </h1>
        <p className="mx-auto mt-2 max-w-[280px] text-sm leading-relaxed text-muted-foreground">
          Pesananmu sudah diterima dan sedang menunggu konfirmasi penjual.
        </p>
      </motion.div>

      {/* Barcode + kode pesanan */}
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="mt-6 w-full rounded-3xl border border-teal-50 bg-white p-5 card-soft"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-primary">
            <Receipt className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Kode Pesanan</p>
            <p className="font-mono text-lg font-extrabold tracking-wide text-foreground">{code}</p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(code).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="press flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-primary"
            aria-label="Salin kode"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        {copied && <p className="mt-1 text-right text-[10px] font-bold text-primary">Kode disalin ✓</p>}

        {/* Barcode pengambilan */}
        {!order || order.status !== "CANCELLED" ? (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-teal-100 p-3 text-center">
            <Barcode value={order?.code ?? "JR-LOADING"} height={48} />
            <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[10px] font-semibold leading-relaxed text-slate-400">
              <QrCode className="h-3.5 w-3.5 shrink-0 text-primary" />
              Barcode konfirmasi — tunjukkan ke penjual saat mengambil pesanan
            </p>
          </div>
        ) : null}

        <div className="mt-3 space-y-1.5 border-t border-dashed border-border pt-3 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-bold text-amber-500">Menunggu Konfirmasi</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Dibuat</span>
            <span className="font-bold">{formatDateTime(order?.createdAt ?? new Date().toISOString())}</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-7 w-full"
      >
        <Button
          onClick={onDone}
          className="press h-[52px] w-full rounded-2xl bg-primary text-base font-extrabold shadow-xl shadow-teal-500/30 hover:bg-teal-700"
        >
          Lihat & Lacak Pesanan Saya
        </Button>
      </motion.div>
    </div>
  );
}
