"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ImagePlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ImageUploader — upload gambar ke /api/upload dengan preview.
 * variant:
 *  - "logo"   : kotak persegi kecil (logo UMKM)
 *  - "banner" : lebar 16:9 (banner latar toko)
 *  - "image"  : persegi lebar (foto produk)
 *  - "qris"   : persegi sedang (kode QRIS)
 */
export function ImageUploader({
  value,
  onChange,
  variant = "image",
  label,
  hint,
  className,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  variant?: "logo" | "banner" | "image" | "qris";
  label: string;
  hint?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = () => inputRef.current?.click();

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah");
      onChange(data.url as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengunggah");
    } finally {
      setUploading(false);
    }
  };

  const boxClass =
    variant === "banner"
      ? "aspect-[16/8] w-full"
      : variant === "logo"
        ? "h-24 w-24"
        : variant === "qris"
          ? "h-44 w-44"
          : "h-40 w-full";

  return (
    <div className={cn(variant === "logo" ? "flex items-start gap-3" : "", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {/* Preview / dropzone */}
      <div className={cn("relative shrink-0", variant === "logo" ? "" : "w-full")}>
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          className={cn(
            "press group relative flex w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/40 transition-colors hover:border-primary/60 hover:bg-teal-50",
            boxClass
          )}
          aria-label={label}
        >
          {value ? (
            <>
              <img src={value} alt={label} className="h-full w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/35 group-hover:opacity-100">
                <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-extrabold text-teal-700">
                  Ganti gambar
                </span>
              </span>
            </>
          ) : (
            <span className="flex flex-col items-center gap-1.5 px-3 text-center">
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <ImagePlus className="h-6 w-6 text-primary/70" />
              )}
              <span className="text-[11px] font-bold text-teal-700">{label}</span>
              {hint && <span className="text-[9px] leading-tight text-slate-400">{hint}</span>}
            </span>
          )}
          {uploading && value && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </span>
          )}
        </button>

        {/* Remove */}
        {value && !uploading && (
          <motion.button
            type="button"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => onChange(null)}
            className="press absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md ring-2 ring-white"
            aria-label="Hapus gambar"
          >
            <X className="h-3.5 w-3.5" />
          </motion.button>
        )}
      </div>

      {error && <p className="mt-1.5 text-[10px] font-semibold text-red-500">{error}</p>}
    </div>
  );
}
