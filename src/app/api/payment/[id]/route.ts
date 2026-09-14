import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const SAFE_SELECT = {
  id: true,
  orderId: true,
  gateway: true,
  amount: true,
  status: true,
  qrImageUrl: true,
  payUrl: true,
  paidAt: true,
  expiresAt: true,
  createdAt: true,
} as const;

/**
 * GET /api/payment/[id] — polling status pembayaran oleh frontend.
 * Status PAID/FAILED HANYA diubah oleh webhook gateway; endpoint ini hanya
 * menandai EXPIRED lokal saat masa berlaku QR habis (status PENDING).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!/^[a-zA-Z0-9]{10,40}$/.test(id)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    let payment = await db.payment.findUnique({ where: { id }, select: SAFE_SELECT });
    if (!payment) {
      return NextResponse.json({ error: "Pembayaran tidak ditemukan" }, { status: 404 });
    }

    // Kedaluwarsa lokal: QR PENDING yang lewat masa berlaku → EXPIRED.
    // (Jika ternyata sudah dibayar, webhook settlement tetap akan mengubahnya ke PAID.)
    if (
      payment.status === "PENDING" &&
      payment.expiresAt &&
      payment.expiresAt.getTime() <= Date.now()
    ) {
      await db.payment.update({ where: { id }, data: { status: "EXPIRED" } });
      payment = { ...payment, status: "EXPIRED" };
    }

    return NextResponse.json({ payment });
  } catch (err) {
    console.error("[payment/get] gagal:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
