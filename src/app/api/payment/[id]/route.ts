import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

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
 * GET /api/payment/[id] — polling status pembayaran oleh pembeli.
 * Pada mode MANUAL, PENDING berarti "menunggu verifikasi penjual".
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!/^[a-z0-9]{10,40}$/i.test(id)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }
    const payment = await db.payment.findUnique({ where: { id }, select: SAFE_SELECT });
    if (!payment) {
      return NextResponse.json({ error: "Pembayaran tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ payment });
  } catch (error) {
    console.error("[payment/:id] GET gagal:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

/**
 * PATCH /api/payment/[id] — penjual memverifikasi bukti bayar QRIS manual.
 * Body: { action: "verify" | "reject", storeId, note? }
 *
 * - verify → status PAID (paidAt + verifiedAt terisi). Pesanan QRIS baru bisa
 *   diterima penjual (PATCH /api/orders/[id] men-gate PENDING→PROCESSING pada
 *   payment PAID).
 * - reject → status FAILED (+ rejectNote opsional) — pembeli bisa kirim
 *   kode referensi baru.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!/^[a-z0-9]{10,40}$/i.test(id)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }
    const { action, storeId, note } = (await req.json()) as {
      action?: string;
      storeId?: string;
      note?: string;
    };

    if (!storeId) {
      return NextResponse.json({ error: "storeId wajib diisi" }, { status: 400 });
    }
    if (action !== "verify" && action !== "reject") {
      return NextResponse.json({ error: "action harus verify atau reject" }, { status: 400 });
    }

    const payment = await db.payment.findUnique({
      where: { id },
      include: { order: { select: { id: true, storeId: true, code: true } } },
    });
    if (!payment) {
      return NextResponse.json({ error: "Pembayaran tidak ditemukan" }, { status: 404 });
    }
    // Verifikasi kepemilikan toko (pola sama dengan route seller lain)
    if (payment.order.storeId !== storeId) {
      return NextResponse.json(
        { error: "Bukan pesanan tokomu — tidak berhak memverifikasi" },
        { status: 403 }
      );
    }

    if (payment.status === "PAID" && action === "verify") {
      // Idempoten
      return NextResponse.json({ payment: await db.payment.findUnique({ where: { id }, select: SAFE_SELECT }) });
    }
    if (payment.status !== "PENDING") {
      return NextResponse.json(
        { error: `Pembayaran sudah berstatus ${payment.status} — tidak bisa diubah lagi.` },
        { status: 409 }
      );
    }

    const updated =
      action === "verify"
        ? await db.payment.update({
            where: { id },
            data: { status: "PAID", paidAt: new Date(), verifiedAt: new Date(), verifiedBy: storeId },
            select: SAFE_SELECT,
          })
        : await db.payment.update({
            where: { id },
            data: {
              status: "FAILED",
              verifiedAt: new Date(),
              verifiedBy: storeId,
              rejectNote: (note || "").trim().slice(0, 140) || null,
            },
            select: SAFE_SELECT,
          });

    return NextResponse.json({ payment: updated });
  } catch (error) {
    console.error("[payment/:id] PATCH gagal:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
