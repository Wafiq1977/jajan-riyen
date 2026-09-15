import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/** Field yang aman dikirim ke frontend (tanpa data internal). */
const SAFE_SELECT = {
  id: true,
  orderId: true,
  gateway: true,
  reference: true,
  amount: true,
  status: true,
  verifiedAt: true,
  rejectNote: true,
  paidAt: true,
  expiresAt: true,
  createdAt: true,
} as const;

/**
 * POST /api/payment/create — pembeli mengirim BUKTI bayar QRIS manual:
 * kode referensi transaksi dari aplikasi e-wallet/m-banking.
 *
 * Alur QRIS MANUAL (tanpa gateway):
 *  1. Pembeli scan QRIS statis penjual (gambar dari toko) & bayar sesuai total.
 *  2. Pembeli menyalin kode referensi transaksi lalu kirim di sini.
 *  3. Status payment = PENDING ("Menunggu Verifikasi Penjual").
 *  4. Penjual cek mutasi/e-wallet → konfirmasi (PAID) atau tolak (FAILED)
 *     via PATCH /api/payment/[id].
 *
 * Idempoten: bila pembayaran PENDING untuk order yang sama sudah ada,
 * dikembalikan apa adanya (anti dobel-kirim).
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId, referenceCode } = (await req.json()) as {
      orderId?: string;
      referenceCode?: string;
    };
    if (!orderId) {
      return NextResponse.json({ error: "orderId wajib diisi" }, { status: 400 });
    }
    const code = (referenceCode || "").trim();
    if (code.length < 4 || code.length > 64) {
      return NextResponse.json(
        { error: "Kode referensi harus 4–64 karakter — salin dari bukti transaksi e-wallet/m-banking-mu." },
        { status: 400 }
      );
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { store: { select: { id: true, name: true, qrisEnabled: true, qrisImageUrl: true } } },
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
    if (order.status === "COMPLETED") {
      return NextResponse.json({ error: "Pesanan sudah selesai" }, { status: 409 });
    }
    if (!order.store.qrisEnabled && !order.store.qrisImageUrl) {
      return NextResponse.json(
        { error: "Penjual belum mengaktifkan QRIS. Gunakan metode TUNAI atau hubungi penjual." },
        { status: 400 }
      );
    }

    // Idempoten: bukti PENDING terakhir dipakai ulang (anti dobel-submit)
    const latest = await db.payment.findFirst({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
    });
    if (latest?.status === "PENDING") {
      return NextResponse.json({ payment: await db.payment.findUnique({ where: { id: latest.id }, select: SAFE_SELECT }) });
    }
    if (latest?.status === "PAID") {
      return NextResponse.json({ payment: await db.payment.findUnique({ where: { id: latest.id }, select: SAFE_SELECT }) });
    }

    // Anti dobel-pakai bukti: kode referensi yang sama tidak boleh menempel
    // di pesanan lain yang masih menunggu verifikasi / sudah terbayar.
    const dup = await db.payment.findFirst({
      where: { reference: code, status: { in: ["PENDING", "PAID"] }, orderId: { not: order.id } },
      select: { id: true },
    });
    if (dup) {
      return NextResponse.json(
        { error: "Kode referensi ini sudah tercatat di pesanan lain. Setiap transaksi punya kode unik — salin kode dari pembayaran untuk pesanan ini." },
        { status: 409 }
      );
    }

    const payment = await db.payment.create({
      data: {
        orderId: order.id,
        gateway: "manual",
        reference: code,
        amount: order.totalPrice,
        status: "PENDING",
      },
      select: SAFE_SELECT,
    });

    return NextResponse.json({ payment });
  } catch (err) {
    console.error("[payment/create] gagal:", err);
    return NextResponse.json(
      { error: "Gagal mengirim bukti pembayaran. Coba lagi beberapa saat." },
      { status: 500 }
    );
  }
}
