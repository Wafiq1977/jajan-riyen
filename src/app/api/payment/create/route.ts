import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createDemoQris,
  createMidtransQris,
  gatewayActive,
  IS_PRODUCTION,
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

    // Buat attempt baru — reference unik per attempt (dibutuhkan Midtrans).
    // Pre-check collision (sangat langka, 1/65536) SEBELUM charge agar tidak
    // ada transaksi yatim di gateway bila DB menolak unique constraint.
    let reference = makeReference(order.code);
    if (await db.payment.findUnique({ where: { reference } })) {
      reference = makeReference(order.code);
    }
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
    const detail = err instanceof Error ? err.message.slice(0, 200) : "tidak diketahui";

    // Pesan ramah untuk kondisi gateway yang umum
    let error = "Gagal membuat QRIS. Coba lagi beberapa saat.";
    if (/not activated/i.test(detail)) {
      const dash = IS_PRODUCTION
        ? "https://dashboard.midtrans.com"
        : "https://dashboard.sandbox.midtrans.com";
      error =
        `Channel pembayaran QRIS/GoPay belum aktif di akun Midtrans ` +
        `${IS_PRODUCTION ? "PRODUKSI" : "SANDBOX"}. Coba: (1) buka ${dash} → ` +
        `Settings → Payment → aktifkan QRIS/GoPay (menu "Payment Link" TIDAK berlaku ` +
        `untuk transaksi API); (2) bila tetap ditolak, email support@midtrans.com ` +
        `minta aktivasi manual channel Core API (QRIS & GoPay) — cantumkan MID akun. ` +
        `Sementara, metode TUNAI tetap bisa dipakai.`;
    } else if (/unknown merchant|server_key|wrong server key|unauthor|401|access denied/i.test(detail)) {
      error =
        "Server Key tidak dikenali gateway (401). Penyebab umum: (1) key sandbox akun Midtrans " +
        "baru TIDAK berprefix 'SB-' sehingga wajib set MIDTRANS_IS_PRODUCTION=false agar dipakai " +
        "ke sandbox; (2) key produksi/sandbox tertukar antar lingkungan; (3) spasi/salah salin key. " +
        "Setelah mengubah env di Vercel, wajib Redeploy.";
    }

    return NextResponse.json(
      {
        error,
        detail,
      },
      { status: 502 }
    );
  }
}
