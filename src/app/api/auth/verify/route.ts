import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { OTP_MAX_ATTEMPTS, hashOtp, normalizePhone } from "@/lib/otp";

/**
 * POST /api/auth/verify — verifikasi kode OTP.
 * Berhasil → kode dikonsumsi (sekali pakai) → user di-upsert & dikembalikan.
 */
export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json();
    if (!phone || !code || typeof code !== "string") {
      return NextResponse.json({ error: "Nomor dan kode verifikasi wajib diisi" }, { status: 400 });
    }

    const phone62 = normalizePhone(phone);
    const cleanCode = code.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      return NextResponse.json({ error: "Kode harus 6 digit" }, { status: 400 });
    }

    const record = await db.verificationCode.findFirst({
      where: { phone: phone62, consumed: false },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Kode tidak ditemukan atau sudah terpakai. Kirim ulang kode ya." },
        { status: 400 }
      );
    }

    if (record.expiresAt < new Date()) {
      await db.verificationCode.update({ where: { id: record.id }, data: { consumed: true } });
      return NextResponse.json(
        { error: "Kode sudah kedaluwarsa. Kirim ulang kode baru." },
        { status: 400 }
      );
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await db.verificationCode.update({ where: { id: record.id }, data: { consumed: true } });
      return NextResponse.json(
        { error: `Terlalu banyak percobaan. Kirim ulang kode baru.` },
        { status: 429 }
      );
    }

    if (record.codeHash !== hashOtp(cleanCode, phone62)) {
      const attempts = record.attempts + 1;
      await db.verificationCode.update({ where: { id: record.id }, data: { attempts } });
      const left = OTP_MAX_ATTEMPTS - attempts;
      return NextResponse.json(
        {
          error:
            left > 0
              ? `Kode salah. Sisa ${left} percobaan.`
              : "Kode salah. Percobaan habis — kirim ulang kode baru.",
        },
        { status: 400 }
      );
    }

    await db.verificationCode.update({ where: { id: record.id }, data: { consumed: true } });

    const user = await db.user.upsert({
      where: { phone: phone62 },
      update: {},
      create: { phone: phone62 },
      include: { store: true },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("OTP verify error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
