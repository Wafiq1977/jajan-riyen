"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, ReceiptText } from "lucide-react";
import type { Order, OrderStatus, User } from "@/lib/types";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ProductThumb,
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
      <div className="bg-brand-gradient px-5 pb-6 pt-7 rounded-b-[2rem]">
        <h1 className="text-2xl font-extrabold text-white">Pesanan</h1>
        <p className="mt-0.5 text-xs text-teal-50/85">Riwayat belanja kamu semua di sini</p>
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

                <div className="flex gap-3 p-4">
                  <ProductThumb product={order.product} className="h-16 w-16 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-extrabold text-foreground">{order.product.name}</h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatRupiah(order.product.price)} × {order.quantity}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <PaymentBadge method={order.paymentMethod} />
                      <span className="rounded-full bg-slate-50 px-2 py-0.5 font-mono text-[9px] font-bold text-slate-500">
                        {order.code}
                      </span>
                    </div>
                  </div>
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
