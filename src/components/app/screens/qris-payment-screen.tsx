"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  QrCode,
  RefreshCcw,
  Smartphone,
  Wallet,
  ShieldCheck,
  PartyPopper,
  Loader2,
  KeyRound,
  XCircle,
  Hourglass,
  Clock3,
} from "lucide-react";
import type { Order, PaymentInfo } from "@/lib/types";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";

/**
 * QrisPaymentScreen — pembayaran QRIS MANUAL (tanpa gateway):
 * 1. Pembeli scan QRIS statis penjual & bayar sesuai total pesanan.
 * 2. Pembeli menyalin kode referensi transaksi dari aplikasi e-wallet/m-banking
 *    lalu mengirimnya sebagai bukti bayar (POST /api/payment/create).
 * 3. Status "Menunggu Verifikasi" — penjual mengecek manual lalu mengonfirmasi
 *    (PAID) atau menolak (FAILED) via dashboard penjual.
 * Layar ini melakukan polling status tiap 3 detik selama menunggu verifikasi.
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refCode, setRefCode] = useState("");

  // 1) Muat order (+ payment terakhir bila ada)
  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const oRes = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      const oData = await oRes.json();
      if (!oRes.ok) throw new Error(oData.error || "Pesanan tidak ditemukan");
      const o = oData.order as Order;
      setOrder(o);
      setPayment(o.payments?.[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat pesanan");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // 2) Polling status — selama menunggu verifikasi penjual (PENDING)
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

  // 3) Kirim kode referensi sebagai bukti bayar
  const submitCode = async () => {
    if (submitting) return;
    const code = refCode.trim();
    if (code.length < 4) {
      setError("Kode referensi terlalu pendek — salin kode dari bukti transaksimu.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const pRes = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, referenceCode: code }),
      });
      const pData = await pRes.json();
      if (!pRes.ok) throw new Error(pData.error || "Gagal mengirim bukti pembayaran");
      setPayment(pData.payment as PaymentInfo);
      setRefCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim bukti pembayaran");
    } finally {
      setSubmitting(false);
    }
  };

  const status = payment?.status ?? null;
  const amount = payment?.amount ?? order?.totalPrice ?? 0;

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
        <PaymentStatusBar status={status} />

        {/* Kartu utama */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-3xl border border-teal-50 bg-white p-4 card-soft"
        >
          {loading ? (
            <div className="flex h-72 items-center justify-center rounded-2xl bg-teal-50/50">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : error && !order ? (
            <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-2xl bg-red-50/60 p-4 text-center">
              <p className="text-xs font-bold text-red-500">{error}</p>
              <Button
                onClick={loadOrder}
                className="press h-10 rounded-xl bg-primary px-5 text-xs font-extrabold hover:bg-teal-700"
              >
                <RefreshCcw className="h-4 w-4" /> Coba Lagi
              </Button>
            </div>
          ) : status === "PAID" ? (
            <PaidPanel onDone={onDone} code={order?.code} />
          ) : status === "PENDING" ? (
            /* ===== Menunggu verifikasi penjual ===== */
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100"
              >
                <Hourglass className="h-8 w-8 text-amber-500" />
              </motion.div>
              <div>
                <p className="text-sm font-extrabold text-foreground">Bukti terkirim — menunggu verifikasi penjual</p>
                <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">
                  Penjual sedang mengecek mutasi/e-wallet-nya. Layar ini otomatis
                  berubah saat pembayaran dikonfirmasi.
                </p>
              </div>
              <div className="w-full rounded-2xl bg-teal-50/70 p-3">
                <p className="text-[9px] font-bold uppercase tracking-wide text-teal-600">Kode referensimu</p>
                <p className="mt-0.5 break-all font-mono text-sm font-extrabold text-primary">
                  {payment?.reference}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Memeriksa status tiap 3 detik…
              </div>
              <p className="text-[10px] font-medium text-slate-400">
                Salah kode? Hubungi penjual untuk menolak bukti ini, lalu kirim kode yang benar.
              </p>
            </div>
          ) : (
            /* ===== Form: scan QR + input kode referensi (belum bayar / ditolak) ===== */
            <>
              {status === "FAILED" && (
                <div className="mb-3 flex items-start gap-2.5 rounded-2xl bg-red-50 p-3 text-left">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <div>
                    <p className="text-[11px] font-extrabold text-red-600">
                      Bukti pembayaran ditolak penjual
                    </p>
                    <p className="text-[10px] font-medium leading-relaxed text-red-500/90">
                      {payment?.rejectNote
                        ? `Alasan: ${payment.rejectNote}. `
                        : ""}
                      Periksa kembali kode referensimu lalu kirim yang benar.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <QrCode className="h-4 w-4 text-primary" />
                  <span className="text-xs font-extrabold text-foreground">
                    Scan QRIS {order?.store.name ?? ""}
                  </span>
                </div>
              </div>

              {/* QR statis penjual */}
              <div className="relative mx-auto mt-3 w-fit rounded-2xl border-2 border-teal-100 bg-white p-3">
                {order?.store.qrisImageUrl ? (
                  <img
                    src={order.store.qrisImageUrl}
                    alt={`QRIS statis ${order.store.name}`}
                    className="h-56 w-56 object-contain"
                  />
                ) : (
                  <div className="flex h-56 w-56 flex-col items-center justify-center gap-2 rounded-xl bg-teal-50 text-center">
                    <QrCode className="h-10 w-10 text-primary/60" />
                    <p className="px-6 text-[10px] font-semibold text-teal-700">
                      QRIS tersedia di kasir penjual
                      {order?.store.qrisCode ? ` · NMID ${order.store.qrisCode}` : ""}
                    </p>
                  </div>
                )}
              </div>

              <p className="mt-2 text-center text-2xl font-extrabold tracking-tight text-primary">
                {formatRupiah(amount)}
              </p>
              <p className="text-center text-[10px] font-semibold text-slate-400">
                Bayar PERSIS sesuai total pesanan {order?.code}
              </p>

              <div className="mt-3 space-y-2 rounded-2xl bg-teal-50/60 p-3 text-[10px] font-medium leading-relaxed text-teal-800">
                <p className="flex items-center gap-2">
                  <Smartphone className="h-3.5 w-3.5 shrink-0" />
                  Buka aplikasi e-wallet / m-banking (GoPay, DANA, OVO, ShopeePay, BCA,
                  BRI, dll.) lalu pilih menu <b>Scan QRIS</b>
                </p>
                <p className="flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5 shrink-0" />
                  Selesaikan pembayaran dan pastikan nominalnya{" "}
                  <b>{formatRupiah(amount)}</b>
                </p>
                <p className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 shrink-0" />
                  Salin <b>kode referensi / ID transaksi</b> dari bukti transaksi
                  (riwayat e-wallet atau mutasi m-banking)
                </p>
              </div>

              {/* Input kode referensi */}
              <div className="mt-3 rounded-2xl border-2 border-teal-100 bg-white p-3">
                <label
                  htmlFor="ref-code"
                  className="flex items-center gap-1.5 text-[11px] font-extrabold text-foreground"
                >
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  Kode Referensi Transaksi
                </label>
                <p className="mb-2 mt-0.5 text-[10px] font-medium text-slate-400">
                  Bukti sah bahwa kamu sudah membayar — akan dicek langsung oleh penjual.
                </p>
                <input
                  id="ref-code"
                  value={refCode}
                  onChange={(e) => setRefCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitCode()}
                  placeholder="Contoh: TP-24091514321 / REF987654321"
                  maxLength={64}
                  autoComplete="off"
                  className="h-11 w-full rounded-xl border-2 border-border bg-slate-50/60 px-3.5 font-mono text-sm font-bold tracking-wide text-foreground outline-none transition-colors placeholder:font-sans placeholder:font-normal placeholder:text-slate-300 focus:border-primary focus:bg-white"
                />
                {error && (
                  <p className="mt-2 text-[10px] font-semibold text-red-500">{error}</p>
                )}
                <Button
                  onClick={submitCode}
                  disabled={submitting || refCode.trim().length < 4}
                  className="press mt-3 h-11 w-full rounded-xl bg-primary text-xs font-extrabold shadow-md shadow-teal-500/25 hover:bg-teal-700 disabled:opacity-40"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4" />
                      Kirim Bukti Pembayaran
                    </span>
                  )}
                </Button>
              </div>
            </>
          )}
        </motion.div>

        {/* Catatan aman */}
        <p className="mt-3 mb-2 flex items-center justify-center gap-1.5 text-center text-[10px] font-semibold text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Pembayaran diverifikasi manual oleh penjual — pastikan nominal & kode referensi sesuai.
        </p>
      </div>
    </div>
  );
}

/** Chip status besar di atas kartu */
function PaymentStatusBar({ status }: { status: PaymentInfo["status"] | null }) {
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
          <p className="text-[10px] text-emerald-50">Diverifikasi oleh penjual</p>
        </div>
      </motion.div>
    );
  }
  if (status === "FAILED") {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl bg-red-500 p-3.5 text-white shadow-lg shadow-red-500/25">
        <XCircle className="h-5 w-5" />
        <p className="text-sm font-extrabold">Pembayaran Gagal — kirim ulang bukti</p>
      </div>
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
  if (status === "PENDING") {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl bg-amber-400 p-3.5 text-amber-950 shadow-lg shadow-amber-400/30">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-900/40" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-800" />
        </span>
        <div>
          <p className="text-sm font-extrabold leading-tight">Menunggu Verifikasi</p>
          <p className="text-[10px] font-semibold text-amber-900/80">
            Penjual sedang mengecek bukti pembayaranmu…
          </p>
        </div>
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
          Scan QRIS lalu kirim kode referensi transaksimu
        </p>
      </div>
    </div>
  );
}

/** Panel sukses setelah penjual memverifikasi */
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
          Pesanan {code} sudah diverifikasi penjual &amp; sedang disiapkan. Tunjukkan
          barcode saat pengambilan.
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
