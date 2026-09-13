import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import sharp from "sharp";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// 4 MB (aman di bawah batas body request serverless Vercel ±4,5 MB)
const MAX_SIZE = 4 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

/**
 * POST /api/upload — unggah gambar (multipart, field "file").
 * Dipakai ImageUploader untuk: logo toko, banner, foto produk, gambar QRIS.
 *
 * DUA MODE OTOMATIS (zero-config, jalan di Vercel/VPS/Railway):
 * 1. CLOUDINARY (opsional) — aktif bila CLOUDINARY_CLOUD_NAME + API_KEY +
 *    API_SECRET terisi. Gambar dilayani dari CDN res.cloudinary.com.
 * 2. DATABASE NEON (default) — gambar dioptimasi (resize maks 1280px + WebP)
 *    lalu disimpan di tabel uploaded_files dan dilayani via /api/files/<id>.
 *    Gratis, tanpa akun baru, dan tersedia dari semua deployment.
 */

const CLD_CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const CLD_KEY = process.env.CLOUDINARY_API_KEY;
const CLD_SECRET = process.env.CLOUDINARY_API_SECRET;
const cloudinaryActive = Boolean(CLD_CLOUD && CLD_KEY && CLD_SECRET);

/** Kirim buffer ke Cloudinary (signed upload, tanpa SDK) → balikin URL aman. */
async function uploadToCloudinary(buffer: Buffer, mime: string, ext: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "jajan-riyen";
  // Signature Cloudinary: parameter diurut alfabetis (k=v&...) + api_secret, lalu SHA-1.
  const toSign = `folder=${folder}&timestamp=${timestamp}${CLD_SECRET}`;
  const signature = createHash("sha1").update(toSign).digest("hex");

  const fd = new FormData();
  fd.append("file", new Blob([new Uint8Array(buffer)], { type: mime }), `image${ext}`);
  fd.append("api_key", CLD_KEY!);
  fd.append("timestamp", String(timestamp));
  fd.append("folder", folder);
  fd.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLD_CLOUD}/image/upload`, {
    method: "POST",
    body: fd,
  });
  const data = (await res.json().catch(() => ({}))) as {
    secure_url?: string;
    error?: { message?: string };
  };
  if (!res.ok || !data.secure_url) {
    throw new Error(`Cloudinary ${res.status}: ${data.error?.message ?? "gagal mengunggah"}`);
  }
  return data.secure_url;
}

/**
 * Optimasi gambar hemat kuota DB: resize sisi terpanjang maks 1280px + konversi
 * WebP kualitas 82 (biasanya 10-30x lebih kecil). GIF dilewati agar animasi utuh.
 * Bila hasil optimasi justru lebih besar, atau sharp gagal — pakai file asli.
 */
async function optimize(buffer: Buffer, mime: string): Promise<{ data: Buffer; mime: string }> {
  if (mime === "image/gif") return { data: buffer, mime };
  try {
    const out = await sharp(buffer)
      .rotate()
      .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    if (out.length < buffer.length) return { data: out, mime: "image/webp" };
    return { data: buffer, mime };
  } catch {
    return { data: buffer, mime };
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    const blob = file as File;
    const type = blob.type || "application/octet-stream";
    const ext = ALLOWED[type];
    if (!ext) {
      return NextResponse.json(
        { error: "Format tidak didukung. Gunakan PNG, JPG, WebP, atau GIF." },
        { status: 400 }
      );
    }
    if (blob.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Ukuran maksimal 4 MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await blob.arrayBuffer());

    // MODE 1 — Cloudinary (opsional, via env)
    if (cloudinaryActive) {
      try {
        const url = await uploadToCloudinary(buffer, type, ext);
        return NextResponse.json({ url, storage: "cloudinary" });
      } catch (err) {
        console.error("[upload] Cloudinary gagal:", err);
        return NextResponse.json(
          { error: "Gagal mengunggah ke penyimpanan cloud. Coba lagi beberapa saat." },
          { status: 502 }
        );
      }
    }

    // MODE 2 — Database Neon (default, gratis, zero-config)
    const optimized = await optimize(buffer, type);
    const row = await db.uploadedFile.create({
      data: { mime: optimized.mime, size: optimized.data.length, data: optimized.data },
      select: { id: true },
    });
    return NextResponse.json({ url: `/api/files/${row.id}`, storage: "db" });
  } catch (err) {
    console.error("[upload] gagal:", err);
    return NextResponse.json(
      {
        error: "Gagal mengunggah file",
        detail: err instanceof Error ? err.message.slice(0, 160) : "tidak diketahui",
      },
      { status: 500 }
    );
  }
}
