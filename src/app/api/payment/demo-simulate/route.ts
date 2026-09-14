import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gatewayActive } from "@/lib/payment";

export const runtime = "nodejs";

/**
 * POST /api/payment/demo-simulate — SIMULASI webhook untuk MODE DEMO (tanpa kredensial).
 * Memakai jalur validasi yang sama dengan webhook asli (cek status, nominal, expiry).
 * Otomatis NONAKTIF (404) begitu MIDTRANS_SERVER_KEY terpasang — produksi hanya
 * menerima validasi dari webhook gateway asli.
 * Body: { paymentId }
 */
export async function POST(req: NextRequest) {
  // Kredensial asli terpasang → simulasi dimatikan total.
  if (gatewayActive) {
    return NextResponse.json({ error: "Mode demo tidak aktif" }, { status: 404 });
  }

  try {
    const { paymentId } = (await req.json()) as { paymentId?: string };
    if (!paymentId) {
      return NextResponse.json({ error: "paymentId wajib diisi" }, { status: 400 });
    }

    const payment = await db.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.gateway !== "demo") {
      return NextResponse.json({ error: "Pembayaran demo tidak ditemukan" }, { status: 404 });
    }

    // Validasi sama seperti webhook asli:
    if (payment.status === "PAID") {
      return NextResponse.json({ payment: { id: payment.id, status: payment.status } });
    }
    if (payment.status !== "PENDING") {
      return NextResponse.json(
        { error: "QRIS sudah tidak berlaku. Buat QR baru." },
        { status: 409 }
      );
    }
    if (payment.expiresAt && payment.expiresAt.getTime() <= Date.now()) {
      await db.payment.update({ where: { id: payment.id }, data: { status: "EXPIRED" } });
      return NextResponse.json({ error: "QRIS sudah expired" }, { status: 409 });
    }

    // Simulasi settlement dari gateway
    const updated = await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        rawPayload: JSON.stringify({ simulated: true, reference: payment.reference }),
      },
    });
    console.log(`[payment/demo] ${payment.reference}: PENDING -> ${updated.status}`);

    return NextResponse.json({ payment: { id: updated.id, status: updated.status } });
  } catch (err) {
    console.error("[payment/demo] gagal:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
