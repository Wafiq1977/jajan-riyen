"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, ReceiptText } from "lucide-react";
import type { Order, OrderStatus, User } from "@/lib/types";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  StatusBadge,
  PaymentBadge,
  EmptyState,
  SkeletonList,
} from "../shared";

const TABS: { key: "ALL" | OrderStatus; label: string }[] = [
  { key: "ALL", label: "Semua" },
  { key: "PENDING", label: "Menunggu" },
  { key: "PROCESSING", label: "Diproses" },
  { key: "COMPLETED", label: "Selesai" },
  { key: "CANCELLED", label: "Dibatalkan" },
];

export default function OrdersScreen({
  user,
  tick,
  onOpenStore,
}: {
  user: User | null;
  tick: number;
  onOpenStore: (storeId: string) => void;
}) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (showSpinner = false) => {
      if (!user) return;
      if (showSpinner) setRefreshing(true);
      try {
        const res = await fetch(`/api/orders?userId=${user.id}`);
        const data = await res.json();
        setOrders(data.orders ?? []);
      } catch {
        setOrders([]);
      } finally {
        if (showSpinner) setRefreshing(false);
      }
    },
    [user]
  );

  useEffect(() => {
    load();
  }, [load, tick]);

  const filtered = useMemo(() => {
    if (!orders) return [];
    return tab === "ALL" ? orders : orders.filter((o) => o.status === tab);
  }, [orders, tab]);

  const cancelOrder = async (id: string) => {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    load();
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-brand-gradient px-5 rounded-b-[2rem] pb-6 pt-8">
        <h1 className="text-2xl font-extrabold text-white">Pesanan</h1>
        <p className="mt-0.5 text-xs text-teal-50/85">Riwayat jajanmu, dipisah per UMKM</p>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 py-3">
          {TABS.map((t) => {
            const active = tab === t.key;
            const count =
              orders && t.key !== "ALL" ? orders.filter((o) => o.status === t.key).length : orders?.length ?? 0;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "press flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition-all",
                  active
                    ? "border-primary bg-primary text-white shadow-md shadow-teal-500/25"
                    : "border-teal-100 bg-white text-slate-500 hover:border-teal-300"
                )}
              >
                {t.label}
                {orders && count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[9px] font-extrabold",
                      active ? "bg-white/25 text-white" : "bg-teal-50 text-teal-600"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          <button
            onClick={() => load(true)}
            className="press ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-teal-100 bg-white text-teal-600"
            aria-label="Muat ulang"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="px-5 pt-1">
        {!orders ? (
          <SkeletonList count={3} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="Belum ada pesanan"
            description="Yuk jelajahi toko terdekat dan temukan promo menarik!"
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((order, idx) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                className="overflow-hidden rounded-3xl border border-teal-50 bg-white card-soft"
              >
                <div className="flex items-center justify-between px-4 pt-3.5">
                  <button
                    onClick={() => onOpenStore(order.storeId)}
                    className="press truncate text-xs font-extrabold text-primary hover:underline"
                  >
                    {order.store.name} ›
                  </button>
                  <StatusBadge status={order.status} />
                </div>

                {/* Items (multi-product, one UMKM) */}
                <div
                  className={cn(
                    "mt-2 space-y-1 px-4",
                    order.items.length > 3 && "max-h-44 overflow-y-auto pretty-scroll"
                  )}
                >
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2.5 py-1.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-teal-50 text-base">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          item.emoji
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-foreground">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatRupiah(item.price)} × {item.quantity}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] font-extrabold text-slate-500">
                        {formatRupiah(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3 pt-2">
                  <PaymentBadge method={order.paymentMethod} />
                  <span className="rounded-full bg-slate-50 px-2 py-0.5 font-mono text-[9px] font-bold text-slate-500">
                    {order.code}
                  </span>
                  <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[9px] font-bold text-teal-600">
                    {order.quantity} item
                  </span>
                </div>

                <div className="voucher-notch border-t border-dashed border-teal-100 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground">
                        Total · {formatDateTime(order.createdAt)}
                      </p>
                      <p className="text-sm font-extrabold text-foreground">{formatRupiah(order.totalPrice)}</p>
                    </div>
                    {order.status === "PENDING" && (
                      <button
                        onClick={() => cancelOrder(order.id)}
                        className="press rounded-full border-2 border-red-100 bg-red-50 px-4 py-2 text-xs font-extrabold text-red-500 hover:bg-red-100"
                      >
                        Batalkan
                      </button>
                    )}
                    {order.status === "PENDING" && order.paymentMethod === "QRIS" && (
                      <span className="text-[9px] font-bold text-violet-400">✓ QRIS terbayar</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
