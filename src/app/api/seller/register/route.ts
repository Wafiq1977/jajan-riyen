import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { userId, name, category, description, address } = await req.json();

    if (!userId || !name || typeof name !== "string") {
      return NextResponse.json({ error: "Nama toko wajib diisi" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId }, include: { store: true } });
    if (!user) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    }
    if (user.store) {
      return NextResponse.json({ error: "Kamu sudah terdaftar sebagai penjual" }, { status: 409 });
    }

    const [store] = await db.$transaction([
      db.store.create({
        data: {
          userId,
          name: name.trim(),
          category: category || "Makanan",
          description: description?.trim() || null,
          address: address?.trim() || null,
        },
      }),
      db.user.update({ where: { id: userId }, data: { isSeller: true } }),
    ]);

    const freshUser = await db.user.findUnique({
      where: { id: userId },
      include: { store: true },
    });

    return NextResponse.json({ store, user: freshUser });
  } catch (error) {
    console.error("Seller register error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
