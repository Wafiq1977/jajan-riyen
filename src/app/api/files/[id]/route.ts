import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/files/[id] — layani gambar yang tersimpan di tabel uploaded_files.
 * ID pernah dilihat = konten tidak pernah berubah, jadi cache browser boleh
 * permanen (immutable) → hemat kuota dan loading instan.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!/^[a-zA-Z0-9]{10,40}$/.test(id)) {
      return new NextResponse("Not found", { status: 404 });
    }

    const file = await db.uploadedFile.findUnique({
      where: { id },
      select: { mime: true, data: true },
    });
    if (!file) {
      return new NextResponse("Not found", { status: 404 });
    }

    const body = new Uint8Array(file.data);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": file.mime,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[files] gagal melayani gambar:", err);
    return new NextResponse("Terjadi kesalahan server", { status: 500 });
  }
}
