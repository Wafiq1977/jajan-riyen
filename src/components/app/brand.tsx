"use client";

import { cn } from "@/lib/utils";

/**
 * JR monogram — Jajan Riyen logo.
 * Dark rounded "JR" letters with a fresh green leaf sprouting from the J,
 * recreated from the owner's logo as crisp SVG.
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
    <svg viewBox="0 0 96 96" className={className} role="img" aria-label="Logo Jajan Riyen">
      <g transform="translate(4 20) rotate(-14 11 11)">
        <path d="M0 22 C0 10 10 0 22 0 C22 12 12 22 0 22 Z" fill={leaf} />
        <path
          d="M3.5 18.5 C8 13 13 8 18.5 3.5"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />
      </g>
      <text
        x="13"
        y="79"
        fontSize="60"
        fontWeight="800"
        letterSpacing="-2"
        fill={ink}
        style={{ fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }}
      >
        J
      </text>
      <text
        x="47"
        y="79"
        fontSize="60"
        fontWeight="800"
        letterSpacing="-2"
        fill={ink}
        style={{ fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }}
      >
        R
      </text>
    </svg>
  );
}

/** Square app-icon style badge with the JR mark on a white card. */
export function JrBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md shadow-teal-900/10",
        className
      )}
    >
      <JrMark className="h-[86%] w-[86%]" />
    </span>
  );
}

/** JR mark on the teal brand gradient (splash / headers). */
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
 * "Jajan Riyen" wordmark next to the JR badge.
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
        <JrMark className={cn(box, "drop-shadow-sm")} ink={light ? "#ffffff" : "#253835"} />
      )}
      <span className={cn("font-extrabold leading-none tracking-tight", text, light ? "text-white" : "text-foreground")}>
        Jajan<span className={light ? "text-emerald-300" : "text-emerald-500"}>Riyen</span>
      </span>
    </span>
  );
}
