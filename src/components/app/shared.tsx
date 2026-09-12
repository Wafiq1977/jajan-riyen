"use client";

import { Star, PackageOpen } from "lucide-react";
import type { Product, PaymentMethod } from "@/lib/types";
import { cn } from "@/lib/utils";
import { discountPercent } from "@/lib/format";

export function ProductThumb({
  product,
  className,
  rounded = "rounded-2xl",
}: {
  product: Pick<Product, "imageUrl" | "emoji" | "name">;
  className?: string;
  rounded?: string;
}) {
  if (product.imageUrl) {
    return (
      <div className={cn("relative overflow-hidden bg-teal-50", rounded, className)}>
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-gradient-to-br from-teal-100 via-teal-50 to-emerald-50 text-3xl",
        rounded,
        className
      )}
      aria-label={product.name}
    >
      <span>{product.emoji}</span>
    </div>
  );
}

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-bold", className)}>
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      {rating.toFixed(1)}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-600 border-amber-200",
  PROCESSING: "bg-teal-50 text-teal-700 border-teal-200",
  COMPLETED: "bg-emerald-50 text-emerald-600 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-500 border-red-200",
};

const STATUS_TEXT: Record<string, string> = {
  PENDING: "Menunggu Konfirmasi",
  PROCESSING: "Diproses",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold",
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-border",
        className
      )}
    >
      {STATUS_TEXT[status] ?? status}
    </span>
  );
}

export function PaymentBadge({ method, className }: { method: PaymentMethod; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold",
        method === "QRIS" ? "bg-violet-50 text-violet-600" : "bg-orange-50 text-orange-600",
        className
      )}
    >
      {method === "QRIS" ? "🔳 QRIS" : "💵 Tunai"}
    </span>
  );
}

export function DiscountBadge({ product }: { product: Product }) {
  const pct = discountPercent(product.price, product.originalPrice);
  if (pct === null) return null;
  return (
    <span className="inline-flex items-center rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
      -{pct}%
    </span>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div>
        <h2 className="text-[17px] font-extrabold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  action,
}: {
  icon?: typeof PackageOpen;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-teal-50">
        <Icon className="h-7 w-7 text-primary/60" strokeWidth={1.8} />
      </div>
      <h3 className="mt-4 text-sm font-bold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-2xl border border-teal-50 bg-white p-3">
          <div className="h-20 w-20 animate-pulse rounded-xl bg-teal-50" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-teal-50" />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-teal-50" />
            <div className="h-4 w-1/3 animate-pulse rounded-full bg-teal-50" />
          </div>
        </div>
      ))}
    </div>
  );
}
