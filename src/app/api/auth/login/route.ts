import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Nomor telepon wajib diisi" }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      return NextResponse.json(
        { error: "Nomor telepon tidak valid (9-15 digit)" },
        { status: 400 }
      );
    }

    const user = await db.user.upsert({
      where: { phone: cleanPhone },
      update: {},
      create: { phone: cleanPhone },
      include: { store: true },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
