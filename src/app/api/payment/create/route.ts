import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createDemoQris,
  createMidtransQris,
  gatewayActive,
  makeReference,
} from "@/lib/payment";

export const runtime = "nodejs";

/** Field yang aman dikirim ke frontend (tanpa data internal). */
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
 * POST /api/payment/create — buat/ambil transaksi QRIS untuk satu order.
 * Body: { orderId }
 * Idempoten: bila ada pembayaran PENDING yang masih berlaku → dikembalikan apa adanya.
 * Bila expired → ditandai EXPIRED dan dibuat attempt baru (QR baru).
 * Bila sudah PAID → dikembalikan tanpa membuat tagihan baru (anti double-charge).
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId } = (await req.json()) as { orderId?: string };
    if (!orderId) {
      return NextResponse.json({ error: "orderId wajib diisi" }, { status: 400 });
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { store: { select: { name: true } }, user: { select: { name: true } } },
    });
    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }
    if (order.paymentMethod !== "QRIS") {
      return NextResponse.json({ error: "Pesanan ini bukan metode QRIS" }, { status: 400 });
    }
    if (order.status === "CANCELLED") {
      return NextResponse.json({ error: "Pesanan sudah dibatalkan" }, { status: 409 });
    }

    // Pembayaran terakhir yang masih PENDING → periksa kedaluwarsanya
    const latest = await db.payment.findFirst({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
    });

    if (latest?.status === "PAID") {
      return NextResponse.json({
        payment: { ...latest, qrImageUrl: undefined, qrString: undefined },
      });
    }

    if (latest?.status === "PENDING") {
      if (latest.expiresAt && latest.expiresAt > new Date()) {
        // Masih berlaku → pakai ulang (idempoten)
        const fresh = await db.payment.findUnique({
          where: { id: latest.id },
          select: SAFE_SELECT,
        });
        return NextResponse.json({ payment: fresh });
      }
      await db.payment.update({ where: { id: latest.id }, data: { status: "EXPIRED" } });
    }

    // Buat attempt baru — reference unik per attempt (dibutuhkan Midtrans)
    const reference = makeReference(order.code);
    const charge = gatewayActive
      ? await createMidtransQris({
          reference,
          amount: order.totalPrice,
          customerName: order.user?.name || undefined,
          itemName: `Pesanan ${order.code}`,
        })
      : await createDemoQris(reference, order.totalPrice);

    const payment = await db.payment.create({
      data: {
        orderId: order.id,
        gateway: gatewayActive ? "midtrans" : "demo",
        reference: charge.reference,
        amount: order.totalPrice,
        status: "PENDING",
        qrString: charge.qrString,
        qrImageUrl: charge.qrImageUrl,
        payUrl: charge.payUrl,
        expiresAt: charge.expiresAt,
      },
      select: SAFE_SELECT,
    });

    return NextResponse.json({ payment });
  } catch (err) {
    console.error("[payment/create] gagal:", err);
    return NextResponse.json(
      {
        error: "Gagal membuat QRIS. Coba lagi beberapa saat.",
        detail: err instanceof Error ? err.message.slice(0, 160) : "tidak diketahui",
      },
      { status: 502 }
    );
  }
}
