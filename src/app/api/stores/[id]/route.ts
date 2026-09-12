import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = await db.store.findUnique({
      where: { id },
      include: { products: { orderBy: { createdAt: "asc" } } },
    });

    if (!store) {
      return NextResponse.json({ error: "Toko tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ store });
  } catch (error) {
    console.error("Get store error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
