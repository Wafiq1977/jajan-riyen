import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchMidtransStatus, mapMidtransStatus } from "@/lib/payment";

export const runtime = "nodejs";

const SAFE_SELECT = {
  id: true,
  orderId: true,
  gateway: true,
  reference: true,
  amount: true,
  status: true,
  qrImageUrl: true,
  payUrl: true,
  paidAt: true,
  expiresAt: true,
  createdAt: true,
} as const;

/**
 * Pembatas cek status ke API Midtrans (in-memory): maks. 1x / 4 detik per
 * pembayaran — polling frontend tiap 3 detik tidak membuat spam request.
 */
const lastGatewayCheck = new Map<string, number>();
const GATEWAY_CHECK_INTERVAL_MS = 4000;

/**
 * GET /api/payment/[id] — polling status pembayaran oleh frontend.
 *
 * Sumber kebenaran status:
 * 1. WEBHOOK Midtrans (/api/payment/webhook) — mekanisme utama.
 * 2. PENGAMAN: bila masih PENDING, server cek langsung ke API status Midtrans
 *    (server-to-server) sehingga pembayaran tetap terdeteksi bila webhook
 *    belum terdaftar / sesekali gagal terkirim. Tetap berbasis gateway.
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

    // Pengaman: sinkronkan status dari gateway bila masih menunggu
    if (payment.status === "PENDING" && payment.gateway === "midtrans" && payment.reference) {
      const last = lastGatewayCheck.get(id) ?? 0;
      if (Date.now() - last > GATEWAY_CHECK_INTERVAL_MS) {
        lastGatewayCheck.set(id, Date.now());
        const g = await fetchMidtransStatus(payment.reference);
        const mapped = g ? mapMidtransStatus(g.transactionStatus, g.fraudStatus) : null;
        if (mapped && mapped !== "PENDING") {
          // Nominal dari gateway harus cocok sebelum menerima PAID
          const gAmount = g?.grossAmount ? Number(g.grossAmount) : NaN;
          const amountOk = !Number.isFinite(gAmount) || gAmount + 0.5 >= payment.amount;
          if (amountOk) {
            await db.payment.update({
              where: { id },
              data: {
                status: mapped,
                paidAt: mapped === "PAID" ? new Date() : undefined,
                rawPayload: g ? JSON.stringify({ via: "status-poll", ...g }).slice(0, 4000) : undefined,
              },
            });
            payment = { ...payment, status: mapped };
          }
        }
      }
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
