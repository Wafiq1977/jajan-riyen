"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Html5Qrcode } from "html5-qrcode";
import { motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  Package,
  Receipt,
  ScanLine,
  Store as StoreIcon,
  Keyboard,
  CameraOff,
  Loader2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { StatusBadge, PaymentBadge } from "./shared";

/* ------------------------------------------------------------------ */
/* Barcode — Code128 renderer                                          */
/* ------------------------------------------------------------------ */

export function Barcode({
  value,
  className,
  height = 56,
}: {
  value: string;
  className?: string;
  height?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        displayValue: false,
        width: 1.7,
        height,
        margin: 2,
        background: "#ffffff",
        lineColor: "#0f172a",
      });
    } catch {
      /* invalid value — ignore */
    }
  }, [value, height]);

  return <svg ref={ref} className={cn("h-auto w-full", className)} aria-label={`Barcode ${value}`} />;
}

/* ------------------------------------------------------------------ */
/* OrderTrackCard — barcode + tracking timeline (shared)               */
/* ------------------------------------------------------------------ */

const STEPS: { key: string; label: string; desc: string }[] = [
  { key: "PENDING", label: "Menunggu Konfirmasi", desc: "Penjual memeriksa pesananmu" },
  { key: "PROCESSING", label: "Diproses", desc: "Pesanan sedang disiapkan" },
  { key: "COMPLETED", label: "Selesai", desc: "Pesanan diterima — selamat menikmati!" },
];

export function OrderTrackCard({
  order,
  compact = false,
  action,
}: {
  order: Order;
  compact?: boolean;
  action?: React.ReactNode;
}) {
  const cancelled = order.status === "CANCELLED";
  const activeIdx = STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-primary">
          <StoreIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-foreground">{order.store?.name ?? "Toko"}</p>
          <p className="font-mono text-[11px] font-bold tracking-wide text-slate-400">{order.code}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Barcode — only for active/completed orders */}
      {!cancelled && (
        <div className="rounded-2xl border border-teal-100 bg-white p-3 text-center">
          <Barcode value={order.code} height={compact ? 44 : 56} />
          <p className="mt-1.5 font-mono text-sm font-black tracking-[0.2em] text-foreground">{order.code}</p>
          <p className="mt-1 text-[10px] font-semibold leading-relaxed text-slate-400">
            Tunjukkan atau minta penjual memindai barcode ini saat mengambil pesanan
          </p>
        </div>
      )}

      {/* Timeline */}
      {cancelled ? (
        <div className="rounded-2xl bg-red-50 p-3 text-center text-[11px] font-bold text-red-500">
          Pesanan ini dibatalkan — barcode tidak aktif.
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-50/70 p-3.5">
          {STEPS.map((step, i) => {
            const done = i < activeIdx;
            const active = i === activeIdx;
            return (
              <div key={step.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black transition-colors",
                      done
                        ? "bg-emerald-500 text-white"
                        : active
                          ? "bg-primary text-white"
                          : "bg-slate-200 text-slate-400"
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className={cn("my-0.5 w-0.5 flex-1 rounded", done ? "bg-emerald-400" : "bg-slate-200")} />
                  )}
                </div>
                <div className={cn("pb-3", i === STEPS.length - 1 && "pb-0")}>
                  <p
                    className={cn(
                      "text-xs font-extrabold",
                      active ? "text-primary" : done ? "text-emerald-600" : "text-slate-400"
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      <div className="flex flex-wrap items-center gap-1.5">
        <PaymentBadge method={order.paymentMethod} />
        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[9px] font-bold text-teal-600">
          {order.quantity} item
        </span>
        <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[9px] font-semibold text-slate-500">
          {formatDateTime(order.createdAt)}
        </span>
        <span className="ml-auto text-sm font-extrabold text-primary">{formatRupiah(order.totalPrice)}</span>
      </div>

      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TrackSheet — bottom sheet "Lacak & Barcode" from orders list        */
/* ------------------------------------------------------------------ */

export function TrackSheet({ order, onClose }: { order: Order | null; onClose: () => void }) {
  return (
    <Drawer open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="mx-auto max-w-[430px] rounded-t-[28px]">
        <div className="pretty-scroll max-h-[82vh] overflow-y-auto px-5 pb-8">
          <DrawerHeader className="px-0 pb-2 pt-1 text-left">
            <DrawerTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4.5 w-4.5 h-[18px] w-[18px] text-primary" />
              Lacak Pesanan &amp; Barcode
            </DrawerTitle>
            <DrawerDescription className="text-left text-[11px]">
              Pindai barcode di kasir penjual untuk konfirmasi pengambilan.
            </DrawerDescription>
          </DrawerHeader>
          {order && <OrderTrackCard order={order} />}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */
/* ScanDialog — camera barcode/QR scan with manual fallback            */
/* ------------------------------------------------------------------ */

type ScanStep = "scan" | "found" | "notfound";

export function ScanDialog({
  open,
  onOpenChange,
  sellerStoreId,
  onOrderUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set (seller mode), quick actions are offered for orders of this store. */
  sellerStoreId?: string;
  onOrderUpdated?: () => void;
}) {
  const [step, setStep] = useState<ScanStep>("scan");
  const [order, setOrder] = useState<Order | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);

  const stopScanner = useCallback(() => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) {
      s.stop()
        .then(() => s.clear())
        .catch(() => {});
    }
  }, []);

  const lookup = useCallback(async (raw: string) => {
    const m = raw.toUpperCase().match(/JR[-\s]?([A-Z0-9]{4,10})/);
    const code = m ? `JR-${m[1]}` : raw.trim().toUpperCase();
    if (!code) return;
    setLookingUp(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/code/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Pesanan tidak ditemukan");
      setOrder(data.order as Order);
      setStep("found");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pesanan tidak ditemukan");
      setStep("notfound");
    } finally {
      setLookingUp(false);
    }
  }, []);

  // Start camera when dialog opens in scan step
  useEffect(() => {
    if (!open || step !== "scan") return;
    let cancelled = false;

    const start = async () => {
      try {
        const scanner = new Html5Qrcode("jr-scan-region", { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 210, height: 210 } },
          (decoded) => {
            if (busyRef.current) return;
            busyRef.current = true;
            stopScanner();
            lookup(decoded).finally(() => {
              busyRef.current = false;
            });
          },
          () => {
            /* per-frame decode misses — ignore */
          }
        );
        if (!cancelled) setCameraError(false);
      } catch {
        if (!cancelled) setCameraError(true);
      }
    };

    start();
    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [open, step, lookup, stopScanner]);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setStep("scan");
      setOrder(null);
      setManualCode("");
      setError(null);
      setCameraError(false);
    }
  }, [open]);

  const advance = (id: string, status: string) => {
    fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.order) setOrder(d.order as Order);
        onOrderUpdated?.();
      })
      .catch(() => {});
  };

  const isSellerMine = sellerStoreId && order?.storeId === sellerStoreId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-primary">
              <ScanLine className="h-4 w-4" />
            </span>
            Scan Barcode Pesanan
          </DialogTitle>
          <DialogDescription className="text-left">
            Arahkan kamera ke barcode/QR pesanan untuk melacak atau mengonfirmasi.
          </DialogDescription>
        </DialogHeader>

        {step === "scan" && (
          <div className="space-y-3">
            {/* Camera region */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-900">
              <div id="jr-scan-region" className="min-h-[220px] w-full [&>video]:w-full" />
              {!cameraError && (
                <>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-44 w-44 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]" />
                  </div>
                  <motion.div
                    className="pointer-events-none absolute left-1/2 top-1/2 h-0.5 w-44 -translate-x-1/2 rounded bg-emerald-400"
                    animate={{ y: [-80, 80, -80] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </>
              )}
              {cameraError && (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 p-6 text-center">
                  <CameraOff className="h-8 w-8 text-white/50" />
                  <p className="text-xs font-bold text-white/85">Kamera tidak tersedia</p>
                  <p className="text-[10px] leading-relaxed text-white/55">
                    Kamera tidak bisa diakses di perangkat ini. Masukkan kode pesanan secara manual di bawah.
                  </p>
                </div>
              )}
            </div>

            {/* Manual fallback */}
            <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-teal-700">
                <Keyboard className="h-3.5 w-3.5" /> Atau masukkan kode manual
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="cth: JR-6QZCLH"
                  className="h-10 min-w-0 flex-1 rounded-xl border border-teal-100 bg-white px-3 font-mono text-xs font-bold tracking-wider outline-none focus:border-primary"
                  onKeyDown={(e) => e.key === "Enter" && manualCode && lookup(manualCode)}
                />
                <Button
                  onClick={() => manualCode && lookup(manualCode)}
                  disabled={!manualCode || lookingUp}
                  className="press h-10 shrink-0 rounded-xl bg-primary px-4 text-xs font-extrabold hover:bg-teal-700"
                >
                  {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lacak"}
                </Button>
              </div>
            </div>
            {error && <p className="text-center text-xs font-semibold text-red-500">{error}</p>}
          </div>
        )}

        {step === "found" && order && (
          <div className="pretty-scroll max-h-[60vh] space-y-3 overflow-y-auto">
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-[11px] font-bold text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Pesanan ditemukan!
              <button onClick={() => setStep("scan")} className="press ml-auto text-[10px] font-extrabold text-primary">
                Scan lagi
              </button>
            </div>
            <OrderTrackCard
              order={order}
              compact
              action={
                sellerStoreId ? (
                  isSellerMine ? (
                    <div className="space-y-2">
                      {order.status === "PENDING" && (
                        <Button
                          onClick={() => advance(order.id, "PROCESSING")}
                          className="press h-10 w-full rounded-xl bg-primary text-xs font-extrabold hover:bg-teal-700"
                        >
                          ✅ Terima Pesanan Ini
                        </Button>
                      )}
                      {order.status === "PROCESSING" && (
                        <Button
                          onClick={() => advance(order.id, "COMPLETED")}
                          className="press h-10 w-full rounded-xl bg-emerald-500 text-xs font-extrabold hover:bg-emerald-600"
                        >
                          🎉 Tandai Selesai
                        </Button>
                      )}
                      {["COMPLETED", "CANCELLED"].includes(order.status) && (
                        <p className="text-center text-[10px] font-semibold text-slate-400">
                          Tidak ada aksi — pesanan sudah {order.status === "COMPLETED" ? "selesai" : "dibatalkan"}.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-amber-50 p-2.5 text-center text-[10px] font-bold text-amber-600">
                      Pesanan ini bukan dari tokomu — mode aksi penjual tidak tersedia.
                    </p>
                  )
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-teal-50 p-2.5 text-[10px] font-bold text-teal-700">
                    <Package className="h-3.5 w-3.5" />
                    Tunjukkan barcode ini ke penjual saat pengambilan.
                  </div>
                )
              }
            />
          </div>
        )}

        {step === "notfound" && (
          <div className="space-y-3 text-center">
            <div className="flex flex-col items-center gap-2 py-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                <X className="h-6 w-6 text-red-400" />
              </span>
              <p className="text-sm font-extrabold text-foreground">Pesanan tidak ditemukan</p>
              <p className="max-w-[260px] text-[11px] leading-relaxed text-muted-foreground">
                {error ?? "Kode tidak dikenali. Pastikan barcode pesanan Jajan Riyen yang dipindai."}
              </p>
            </div>
            <Button
              onClick={() => {
                setStep("scan");
                setError(null);
              }}
              className="press h-10 w-full rounded-xl bg-primary text-xs font-extrabold hover:bg-teal-700"
            >
              Coba Scan Lagi
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
