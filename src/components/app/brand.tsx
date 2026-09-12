"use client";

import { cn } from "@/lib/utils";

/**
 * Logo Jajan Riyen v3 — "Mulut Melet".
 * Logo GARIS (monoline, stroke tanpa fill): mulut melet / celibur
 * — bibir atas, bibir bawah, dan lidah yang menjulur lucu.
 * Digambar murni dengan path SVG sehingga tampil identik di semua ukuran.
 */
export function JrMark({
  className,
  ink = "#253835",
  tongue,
}: {
  className?: string;
  /** Warna garis bibir & lidah. */
  ink?: string;
  /** Warna lidah berbeda (opsional) — default mengikuti `ink`. */
  tongue?: string;
}) {
  const t = tongue ?? ink;
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      role="img"
      aria-label="Logo Jajan Riyen — mulut melet"
    >
      {/* bibir atas (cupid's bow) */}
      <path
        d="M8 27 C14 14.5 26 12.5 32 19.5 C38 12.5 50 14.5 56 27"
        stroke={ink}
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* bibir bawah */}
      <path
        d="M8 27 C15 41 24 44.5 32 44.5 C40 44.5 49 41 56 27"
        stroke={ink}
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* garis tengah bibir */}
      <path
        d="M13.5 26 C22 29.5 42 29.5 50.5 26"
        stroke={ink}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.75"
      />
      {/* lidah menjulur (melet) */}
      <path
        d="M25.5 44 C24.5 56.5 41 57 40 45.5"
        stroke={t}
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M32.7 47.5 V53.5" stroke={t} strokeWidth="3" strokeLinecap="round" opacity="0.75" />
    </svg>
  );
}

/** Square app-icon badge: mulut melet di atas gradien teal brand. */
export function JrBadge({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl",
        light ? "bg-white/15 backdrop-blur" : "bg-brand-gradient shadow-md shadow-teal-900/15",
        className
      )}
    >
      <JrMark className="h-[88%] w-[88%]" ink="#ffffff" tongue="#6ee7a0" />
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
      <JrMark className="h-[88%] w-[88%]" ink="#ffffff" tongue="#6ee7a0" />
    </span>
  );
}

/**
 * Wordmark "Jajan Riyen" di samping logo mulut melet.
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
        <JrMark
          className={cn(box, light && "drop-shadow-sm")}
          ink={light ? "#ffffff" : "#253835"}
          tongue={light ? "#6ee7a0" : "#0d9488"}
        />
      )}
      <span className={cn("font-extrabold leading-none tracking-tight", text, light ? "text-white" : "text-foreground")}>
        Jajan<span className={light ? "text-emerald-300" : "text-emerald-500"}>Riyen</span>
      </span>
    </span>
  );
}
