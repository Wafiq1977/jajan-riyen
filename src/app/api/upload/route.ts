import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { mkdirSync } from "fs";
import { writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
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
 * DUA MODE OTOMATIS:
 * 1. CLOUDINARY — aktif bila CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY +
 *    CLOUDINARY_API_SECRET terisi di env. Wajib untuk Vercel (filesystem
 *    read-only). Gambar dilayani dari res.cloudinary.com.
 * 2. DISK (fallback) — tanpa env Cloudinary, file ditulis ke public/uploads/
 *    dan dilayani di /uploads/<nama>. Cocok untuk VPS, Railway (dengan
 *    Volume), dan sandbox development.
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
        { error: "Ukuran maksimal 5 MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await blob.arrayBuffer());

    // MODE 1 — Cloudinary (Vercel / produksi tanpa disk)
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

    // MODE 2 — Disk lokal (VPS / Railway+Volume / sandbox)
    const dir = path.join(process.cwd(), "public", "uploads");
    mkdirSync(dir, { recursive: true });

    const name = `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
    await writeFile(path.join(dir, name), buffer);

    return NextResponse.json({ url: `/uploads/${name}`, storage: "disk" });
  } catch (err) {
    console.error("[upload] gagal:", err);
    return NextResponse.json({ error: "Gagal mengunggah file" }, { status: 500 });
  }
}
