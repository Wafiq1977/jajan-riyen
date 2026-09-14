"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  QrCode,
  RefreshCcw,
  Smartphone,
  Wallet,
  ShieldCheck,
  PartyPopper,
  Loader2,
} from "lucide-react";
import type { Order, PaymentInfo } from "@/lib/types";
import { formatRupiah, paymentStatusLabel, secondsLeft } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * QrisPaymentScreen — tampilkan QRIS dinamis sesuai total pesanan,
 * polling status tiap 3 detik. Validasi pembayaran dilakukan server
 * berdasarkan webhook payment gateway (bukan klaim pembeli).
 */
export default function QrisPaymentScreen({
  orderId,
  onBack,
  onDone,
}: {
  orderId: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false); // tombol simulasi demo
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  // 1) Muat order + buat/ambil QR (idempoten di server)
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const oRes = await fetch(`/api/orders/${orderId}`);
        const oData = await oRes.json();
        if (!oRes.ok) throw new Error(oData.error || "Pesanan tidak ditemukan");
        setOrder(oData.order as Order);

        const pRes = await fetch("/api/payment/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const pData = await pRes.json();
        if (!pRes.ok) throw new Error(pData.error || "Gagal membuat QRIS");
        setPayment(pData.payment as PaymentInfo);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyiapkan QRIS");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  // 2) Polling status — hanya saat PENDING
  useEffect(() => {
    if (!payment || payment.status !== "PENDING") return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/payment/${payment.id}`, { cache: "no-store" });
        const d = await r.json();
        if (r.ok && d.payment) setPayment(d.payment as PaymentInfo);
      } catch {
        /* jaringan goyah — coba lagi di tick berikutnya */
      }
    }, 3000);
    return () => clearInterval(t);
  }, [payment]);

  // 3) Countdown
  const [left, setLeft] = useState(0);
  useEffect(() => {
    setLeft(secondsLeft(payment?.expiresAt));
    const t = setInterval(() => setLeft(secondsLeft(payment?.expiresAt)), 1000);
    return () => clearInterval(t);
  }, [payment?.expiresAt]);

  // 4) Buat QR baru setelah expired
  const regenerate = useCallback(async () => {
    if (paying) return;
    setError(null);
    setLoading(true);
    try {
      const pRes = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const pData = await pRes.json();
      if (!pRes.ok) throw new Error(pData.error || "Gagal membuat QR baru");
      setPayment(pData.payment as PaymentInfo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat QR baru");
    } finally {
      setLoading(false);
    }
  }, [orderId, paying]);

  // 5) Simulasi bayar (mode demo saja)
  const simulatePay = useCallback(async () => {
    if (!payment || paying) return;
    setPaying(true);
    setError(null);
    try {
      const r = await fetch("/api/payment/demo-simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Simulasi gagal");
      setPayment({ ...payment, status: "PAID", paidAt: new Date().toISOString() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulasi gagal");
    } finally {
      setPaying(false);
    }
  }, [payment, paying]);

  const status = payment?.status ?? "PENDING";
  const isDemo = payment?.gateway === "demo";
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="min-h-screen bg-brand-radial pb-16">
      {/* Header */}
      <div className="bg-brand-gradient px-5 pb-16 pt-5 rounded-b-[2rem] relative overflow-hidden">
        <motion.div
          className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={onBack}
            className="press flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-extrabold text-white">Bayar via QRIS</h1>
            <p className="text-[11px] text-teal-50/90">
              {order ? order.store.name : "…"} · {order?.code}
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 -mt-10 px-5">
        {/* Status pembayaran */}
        <PaymentStatusBar status={status} left={left} paidAt={payment?.paidAt} />

        {/* Kartu QR */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-3xl border border-teal-50 bg-white p-4 card-soft"
        >
          {loading ? (
            <div className="flex h-72 items-center justify-center rounded-2xl bg-teal-50/50">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-2xl bg-red-50/60 p-4 text-center">
              <p className="text-xs font-bold text-red-500">{error}</p>
              <Button
                onClick={regenerate}
                className="press h-10 rounded-xl bg-primary px-5 text-xs font-extrabold hover:bg-teal-700"
              >
                <RefreshCcw className="h-4 w-4" /> Coba Lagi
              </Button>
            </div>
          ) : status === "PAID" ? (
            <PaidPanel onDone={onDone} code={order?.code} />
          ) : status === "EXPIRED" || status === "FAILED" ? (
            <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-2xl bg-amber-50/70 p-4 text-center">
              <Clock3 className="h-8 w-8 text-amber-500" />
              <p className="text-xs font-bold text-amber-600">
                {status === "EXPIRED"
                  ? "Waktu pembayaran habis. Buat QR baru untuk mencoba lagi."
                  : "Pembayaran gagal diproses. Buat QR baru untuk mencoba lagi."}
              </p>
              <Button
                onClick={regenerate}
                className="press h-10 rounded-xl bg-primary px-5 text-xs font-extrabold hover:bg-teal-700"
              >
                <RefreshCcw className="h-4 w-4" /> Buat QR Baru
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <QrCode className="h-4 w-4 text-primary" />
                  <span className="text-xs font-extrabold text-foreground">
                    Scan kode QRIS
                  </span>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-extrabold",
                    left <= 60 ? "bg-red-50 text-red-500" : "bg-teal-50 text-primary"
                  )}
                >
                  Berlaku {mm}:{ss}
                </span>
              </div>

              {/* QR */}
              <div className="relative mx-auto mt-3 w-fit rounded-2xl border-2 border-teal-100 bg-white p-3">
                {payment?.qrImageUrl ? (
                  <img
                    src={payment.qrImageUrl}
                    alt="Kode QRIS pembayaran"
                    className="h-56 w-56 object-contain"
                  />
                ) : (
                  <div className="flex h-56 w-56 items-center justify-center rounded-xl bg-teal-50">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
                {left <= 0 && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/95">
                    <span className="rounded-full bg-red-50 px-4 py-2 text-xs font-extrabold text-red-500">
                      QR Kedaluwarsa
                    </span>
                  </div>
                )}
              </div>

              <p className="mt-2 text-center text-2xl font-extrabold tracking-tight text-primary">
                {formatRupiah(payment?.amount ?? order?.totalPrice ?? 0)}
              </p>
              <p className="text-center text-[10px] font-semibold text-slate-400">
                Total sesuai pesanan {order?.code} — dicek otomatis oleh sistem
              </p>

              {isDemo && (
                <div className="mt-3 rounded-2xl bg-violet-50 p-3 text-center">
                  <p className="text-[10px] font-extrabold text-violet-600">
                    MODE DEMO — gateway belum dikonfigurasi (isi MIDTRANS_SERVER_KEY di
                    server untuk QRIS asli)
                  </p>
                  <Button
                    onClick={simulatePay}
                    disabled={paying || left <= 0}
                    className="press mt-2 h-10 w-full rounded-xl bg-violet-500 text-xs font-extrabold text-white hover:bg-violet-600 disabled:opacity-40"
                  >
                    {paying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "▶ Simulasi: Pembayaran Berhasil"
                    )}
                  </Button>
                </div>
              )}

              <div className="mt-3 space-y-2 rounded-2xl bg-teal-50/60 p-3 text-[10px] font-medium leading-relaxed text-teal-800">
                <p className="flex items-center gap-2">
                  <Smartphone className="h-3.5 w-3.5 shrink-0" />
                  Buka aplikasi e-wallet / m-banking (GoPay, DANA, OVO, ShopeePay, BCA,
                  BRI, dll.)
                </p>
                <p className="flex items-center gap-2">
                  <QrCode className="h-3.5 w-3.5 shrink-0" />
                  Pilih menu <b>Scan QRIS</b> lalu arahkan ke kode di atas
                </p>
                <p className="flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5 shrink-0" />
                  Pastikan nominal {formatRupiah(payment?.amount ?? 0)} lalu selesaikan
                  pembayaran
                </p>
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  Status berubah otomatis setelah gateway mengonfirmasi pembayaran
                </p>
              </div>
            </>
          )}
        </motion.div>

        {/* Catatan aman */}
        <p className="mt-3 mb-2 flex items-center justify-center gap-1.5 text-center text-[10px] font-semibold text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Pembayaran divalidasi langsung oleh payment gateway via webhook — bukan klaim
          pembeli.
        </p>
      </div>
    </div>
  );
}

/** Chip status besar di atas kartu */
function PaymentStatusBar({
  status,
  left,
  paidAt,
}: {
  status: string;
  left: number;
  paidAt?: string | null;
}) {
  if (status === "PAID") {
    return (
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-2.5 rounded-2xl bg-emerald-500 p-3.5 text-white shadow-lg shadow-emerald-500/30"
      >
        <CheckCircle2 className="h-5 w-5" />
        <div>
          <p className="text-sm font-extrabold leading-tight">Pembayaran Berhasil</p>
          <p className="text-[10px] text-emerald-50">
            Dikonfirmasi payment gateway{paidAt ? "" : " · just now"}
          </p>
        </div>
      </motion.div>
    );
  }
  if (status === "EXPIRED") {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl bg-red-500 p-3.5 text-white shadow-lg shadow-red-500/25">
        <Clock3 className="h-5 w-5" />
        <p className="text-sm font-extrabold">Pembayaran Expired</p>
      </div>
    );
  }
  if (status === "FAILED") {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl bg-red-500 p-3.5 text-white shadow-lg shadow-red-500/25">
        <Clock3 className="h-5 w-5" />
        <p className="text-sm font-extrabold">Pembayaran Gagal</p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-amber-400 p-3.5 text-amber-950 shadow-lg shadow-amber-400/30">
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-900/40" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-800" />
      </span>
      <div>
        <p className="text-sm font-extrabold leading-tight">Menunggu Pembayaran</p>
        <p className="text-[10px] font-semibold text-amber-900/80">
          {left > 0
            ? `Menunggu konfirmasi dari gateway · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`
            : "Menunggu konfirmasi dari gateway…"}
        </p>
      </div>
    </div>
  );
}

/** Panel sukses setelah PAID */
function PaidPanel({ onDone, code }: { onDone: () => void; code?: string }) {
  return (
    <motion.div
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex h-72 flex-col items-center justify-center gap-3 rounded-2xl bg-emerald-50 p-4 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/40"
      >
        <PartyPopper className="h-8 w-8" />
      </motion.div>
      <div>
        <p className="text-base font-extrabold text-emerald-600">Pembayaran Berhasil!</p>
        <p className="mt-0.5 text-[11px] font-semibold text-emerald-700/80">
          Pesanan {code} terbayar & sedang diproses penjual. Tunjukkan barcode saat
          pengambilan.
        </p>
      </div>
      <Button
        onClick={onDone}
        className="press h-11 rounded-xl bg-emerald-500 px-6 text-xs font-extrabold text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600"
      >
        Lihat Pesanan Saya
      </Button>
    </motion.div>
  );
}
