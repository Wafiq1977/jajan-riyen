import { NextRequest, NextResponse } from "next/server";
import { mkdirSync } from "fs";
import { writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

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
 * File disimpan ke public/uploads/ dan dilayani di /uploads/<nama>.
 * (Catatan: filesystem Vercel read-only — untuk Vercel gunakan penyimpanan
 * cloud seperti Cloudinary/S3; lihat PANDUAN-DEPLOY.md bagian 6.)
 */
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
    const dir = path.join(process.cwd(), "public", "uploads");
    mkdirSync(dir, { recursive: true });

    const name = `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
    await writeFile(path.join(dir, name), buffer);

    return NextResponse.json({ url: `/uploads/${name}` });
  } catch (err) {
    console.error("[upload] gagal:", err);
    return NextResponse.json({ error: "Gagal mengunggah file" }, { status: 500 });
  }
}
