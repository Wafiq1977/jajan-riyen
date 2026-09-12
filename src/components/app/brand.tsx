"use client";

import { cn } from "@/lib/utils";

/**
 * Logo Jajan Riyen v4 — Daun Hijau 3D Realistis.
 * Merender PNG transparan (public/logo-leaf.png) hasil render 3D:
 * daun hijau segar bertetesan air dengan tangkai melingkar.
 * Props `ink`/`tongue` dipertahankan demi kompatibilitas pemanggil lama
 * (kini diabaikan karena logo berwarna penuh).
 */
export function JrMark({
  className,
  ink: _ink,
  tongue: _tongue,
}: {
  className?: string;
  /** @deprecated tidak dipakai pada logo v4 (gambar berwarna penuh) */
  ink?: string;
  /** @deprecated tidak dipakai pada logo v4 (gambar berwarna penuh) */
  tongue?: string;
}) {
  void _ink;
  void _tongue;
  return (
    <img
      src="/logo-leaf.png"
      alt="Logo Jajan Riyen — daun hijau 3D"
      className={cn("select-none object-contain", className)}
      draggable={false}
    />
  );
}

/** Square app-icon badge: daun 3D di atas gradien teal brand. */
export function JrBadge({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl",
        light ? "bg-white/15 backdrop-blur" : "bg-brand-gradient shadow-md shadow-teal-900/15",
        className
      )}
    >
      <JrMark className="h-[86%] w-[86%] drop-shadow-sm" />
    </span>
  );
}

/** JR mark pada gradien teal brand (header). */
export function JrBadgeGradient({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-2xl bg-brand-gradient shadow-lg shadow-teal-900/20",
        className
      )}
    >
      <JrMark className="h-[86%] w-[86%] drop-shadow-sm" />
    </span>
  );
}

/**
 * Wordmark "Jajan Riyen" di samping logo daun.
 * `light` = dipakai di atas header gradien teal.
 */
export function BrandWordmark({
  light = false,
  size = "md",
  badge = false,
}: {
  light?: boolean;
  size?: "sm" | "md" | "lg";
  badge?: boolean;
}) {
  const box = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const text = size === "lg" ? "text-[26px]" : size === "sm" ? "text-[17px]" : "text-[21px]";
  return (
    <span className="inline-flex items-center gap-2">
      {badge ? (
        <JrBadge className={box} />
      ) : (
        <JrMark className={cn(box, light && "drop-shadow-md")} />
      )}
      <span className={cn("font-extrabold leading-none tracking-tight", text, light ? "text-white" : "text-foreground")}>
        Jajan<span className={light ? "text-emerald-300" : "text-emerald-500"}>Riyen</span>
      </span>
    </span>
  );
}
