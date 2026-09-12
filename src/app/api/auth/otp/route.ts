import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  OTP_MAX_PER_HOUR,
  OTP_TTL_MINUTES,
  activeProvider,
  generateOtp,
  hashOtp,
  normalizePhone,
  sendOtp,
} from "@/lib/otp";

/**
 * POST /api/auth/otp — minta kode verifikasi.
 * Kode disimpan ter-hash di DB & dikirim via WhatsApp/SMS (gateway di .env).
 * Tanpa gateway (.env kosong) respons berisi devMode agar bisa dites lokal.
 */
export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Nomor telepon wajib diisi" }, { status: 400 });
    }

    const phone62 = normalizePhone(phone);
    if (phone62.length < 9 || phone62.length > 15) {
      return NextResponse.json({ error: "Nomor telepon tidak valid" }, { status: 400 });
    }

    // Batasi permintaan: maks 5 kode per nomor per jam
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await db.verificationCode.count({
      where: { phone: phone62, createdAt: { gte: oneHourAgo } },
    });
    if (recent >= OTP_MAX_PER_HOUR) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan kode. Coba lagi dalam satu jam." },
        { status: 429 }
      );
    }

    // Code baru selalu menggantikan kode lama yang belum terpakai
    await db.verificationCode.updateMany({
      where: { phone: phone62, consumed: false },
      data: { consumed: true },
    });

    const code = generateOtp();
    await db.verificationCode.create({
      data: {
        phone: phone62,
        codeHash: hashOtp(code, phone62),
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
      },
    });

    const result = await sendOtp(phone62, code);

    if (result.sent) {
      return NextResponse.json({
        ok: true,
        sent: true,
        via: result.via,
        provider: result.provider,
        expiresAt: OTP_TTL_MINUTES * 60,
      });
    }

    if (result.provider) {
      // Gateway dikonfigurasi tapi gagal kirim
      console.error("OTP send failed:", result.error);
      return NextResponse.json(
        { error: `Gagal mengirim kode via ${result.via === "sms" ? "SMS" : "WhatsApp"}. Coba lagi beberapa saat.` },
        { status: 502 }
      );
    }

    // Tidak ada gateway → mode pengembangan (kode tampil di aplikasi)
    return NextResponse.json({
      ok: true,
      sent: false,
      devMode: true,
      devCode: code,
      expiresAt: OTP_TTL_MINUTES * 60,
    });
  } catch (error) {
    console.error("OTP request error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

/** GET — info provider aktif (untuk banner di layar login). */
export async function GET() {
  const active = activeProvider();
  return NextResponse.json({ provider: active?.provider ?? null, via: active?.via ?? null });
}
