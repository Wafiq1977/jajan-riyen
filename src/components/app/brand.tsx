"use client";

import { cn } from "@/lib/utils";

/**
 * JR monogram — Jajan Riyen logo v2.
 * J and R are fused into ONE connected stroke: the J's bottom hook flows up
 * into the R's stem, and a fresh leaf sprouts from the shared top line.
 * Pure paths (no font dependency) so it renders identically everywhere.
 */
export function JrMark({
  className,
  ink = "#253835",
  leaf = "#2fbf5f",
}: {
  className?: string;
  ink?: string;
  leaf?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      role="img"
      aria-label="Logo Jajan Riyen"
    >
      {/* leaf sprouting from the J top */}
      <path d="M15.5 14 C15.5 8 19.5 4.4 25 4 C25.5 9.6 21 13.7 15.5 14 Z" fill={leaf} />
      <path
        d="M17 12.4 C19 10.5 21 8.5 23.4 6.8"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* J — hook flows up into the R stem (connected ligature) */}
      <path
        d="M15.5 14 V32 A9.5 9.5 0 0 0 34.5 32 V52"
        stroke={ink}
        strokeWidth="6.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* R — stem shared with the J hook, bowl + leg branch off */}
      <path
        d="M34.5 52 V14 H42 A9 9 0 0 1 42 32 H34.5"
        stroke={ink}
        strokeWidth="6.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M42 32 L51.5 52" stroke={ink} strokeWidth="6.4" strokeLinecap="round" />
    </svg>
  );
}

/** Square app-icon badge: connected JR on the teal brand gradient. */
export function JrBadge({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl",
        light ? "bg-white/15 backdrop-blur" : "bg-brand-gradient shadow-md shadow-teal-900/15",
        className
      )}
    >
      <JrMark className="h-[88%] w-[88%]" ink="#ffffff" leaf="#6ee7a0" />
    </span>
  );
}

/** JR mark on the teal brand gradient (headers). */
export function JrBadgeGradient({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-2xl bg-brand-gradient shadow-lg shadow-teal-900/20",
        className
      )}
    >
      <JrMark className="h-[88%] w-[88%]" ink="#ffffff" leaf="#6ee7a0" />
    </span>
  );
}

/**
 * "Jajan Riyen" wordmark next to the JR mark.
 * `light` = for use on teal gradient headers.
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
          leaf={light ? "#6ee7a0" : "#2fbf5f"}
        />
      )}
      <span className={cn("font-extrabold leading-none tracking-tight", text, light ? "text-white" : "text-foreground")}>
        Jajan<span className={light ? "text-emerald-300" : "text-emerald-500"}>Riyen</span>
      </span>
    </span>
  );
}
