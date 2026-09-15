import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const VALID_STATUSES = ["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: true,
        store: true,
        user: { select: { id: true, phone: true, name: true } },
        payments: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            gateway: true,
            reference: true,
            amount: true,
            status: true,
            verifiedAt: true,
            rejectNote: true,
            paidAt: true,
            expiresAt: true,
            createdAt: true,
          },
        },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (error) {
    console.error("Get order error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

/**
 * DELETE /api/orders/[id] — hapus pesanan dari riwayat PEMBELI (soft delete).
 * Body: { userId }
 *  • Hanya pemilik pesanan yang boleh menghapus (403 bila bukan).
 *  • Hanya pesanan COMPLETED / CANCELLED yang bisa dihapus (409 bila masih aktif)
 *    — pesanan PENDING dibatalkan dulu lewat tombol "Batalkan".
 *  • buyerDeletedAt dicatat: pesanan hilang dari riwayat pembeli, tetapi tetap
 *    terlihat di dashboard penjual (catatan transaksi tetap utuh).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await req.json().catch(() => ({ userId: null }));

    if (!userId) {
      return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });
    }

    const existing = await db.order.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }
    if (existing.userId !== userId) {
      return NextResponse.json(
        { error: "Kamu tidak punya akses untuk menghapus pesanan ini" },
        { status: 403 }
      );
    }
    if (!["COMPLETED", "CANCELLED"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Pesanan masih aktif — batalkan pesanannya dulu bila ingin menghapus." },
        { status: 409 }
      );
    }

    await db.order.update({
      where: { id },
      data: { buyerDeletedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete order error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await req.json();

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    const existing = await db.order.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    // Gate QRIS manual: pesanan QRIS hanya bisa diterima (PENDING → PROCESSING)
    // bila bukti bayar sudah DIVERIFIKASI penjual (payment PAID).
    if (status === "PROCESSING" && existing.paymentMethod === "QRIS") {
      const latestPayment = await db.payment.findFirst({
        where: { orderId: id },
        orderBy: { createdAt: "desc" },
        select: { status: true },
      });
      if (latestPayment?.status !== "PAID") {
        return NextResponse.json(
          {
            error:
              "Pembayaran QRIS belum terverifikasi. Periksa & verifikasi kode referensi pembeli dulu di daftar pesanan.",
          },
          { status: 409 }
        );
      }
    }

    const order = await db.order.update({
      where: { id },
      data: { status },
      include: { items: true, store: true },
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
