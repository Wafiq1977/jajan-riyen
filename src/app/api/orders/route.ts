import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function generateOrderCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "JR-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

interface IncomingItem {
  productId: string;
  quantity: number;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const storeId = searchParams.get("storeId");

    if (!userId && !storeId) {
      return NextResponse.json(
        { error: "userId atau storeId wajib diisi" },
        { status: 400 }
      );
    }

    const orders = await db.order.findMany({
      where: userId
        ? { userId, buyerDeletedAt: null } // riwayat pembeli: sembunyikan yang sudah dihapus pembeli
        : { storeId: storeId! }, // dashboard penjual tetap melihat semua pesanan toko
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Get orders error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

/** Dilempar saat kode referensi sudah tercatat di pesanan lain (anti dobel-pakai bukti). */
class DuplicateReferenceError extends Error {}

export async function POST(req: NextRequest) {
  try {
    const { userId, storeId, paymentMethod, items, referenceCode, note } = (await req.json()) as {
      userId: string;
      storeId?: string;
      paymentMethod: string;
      items: IncomingItem[];
      referenceCode?: string;
      note?: string;
    };

    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Data pesanan tidak lengkap (minimal 1 produk)" },
        { status: 400 }
      );
    }
    if (paymentMethod !== "TUNAI" && paymentMethod !== "QRIS") {
      return NextResponse.json({ error: "Metode pembayaran tidak valid" }, { status: 400 });
    }

    // QRIS manual — bukti bayar opsional saat checkout: kode referensi transaksi
    // dari e-wallet/m-banking. Bila dikosongkan, pembeli bisa mengirimnya belakangan
    // lewat layar bayar QRIS (menu Pesanan).
    const refCode = (referenceCode || "").trim();
    if (refCode && (refCode.length < 4 || refCode.length > 64)) {
      return NextResponse.json(
        { error: "Kode referensi harus 4–64 karakter — salin dari bukti transaksi e-wallet/m-banking-mu." },
        { status: 400 }
      );
    }

    // Catatan pesanan dari pembeli (request khusus ke penjual) — opsional, maks 200 karakter
    const rawNote = (note || "").trim();
    if (rawNote.length > 200) {
      return NextResponse.json(
        { error: "Catatan pesanan maksimal 200 karakter." },
        { status: 400 }
      );
    }
    const orderNote = rawNote || null;

    // Normalize quantities
    const normalized = items
      .map((it) => ({
        productId: String(it.productId),
        quantity: Math.max(1, Math.floor(Number(it.quantity) || 0)),
      }))
      .filter((it) => it.productId);

    if (normalized.length === 0) {
      return NextResponse.json({ error: "Item pesanan tidak valid" }, { status: 400 });
    }

    // Dedupe by product (sum quantities)
    const qtyByProduct = new Map<string, number>();
    for (const it of normalized) {
      qtyByProduct.set(it.productId, (qtyByProduct.get(it.productId) ?? 0) + it.quantity);
    }

    const products = await db.product.findMany({
      where: { id: { in: [...qtyByProduct.keys()] } },
    });

    if (products.length !== qtyByProduct.size) {
      return NextResponse.json(
        { error: "Ada produk yang tidak ditemukan" },
        { status: 404 }
      );
    }

    // ALL items must belong to ONE UMKM (store) — transactions are never merged across stores
    const storeIds = new Set(products.map((p) => p.storeId));
    if (storeIds.size > 1) {
      return NextResponse.json(
        { error: "Pesanan harus dari satu toko yang sama. Transaksi antar UMKM tidak dapat digabung." },
        { status: 409 }
      );
    }
    if (storeId && products[0].storeId !== storeId) {
      return NextResponse.json(
        { error: "Produk tidak sesuai dengan toko pesanan" },
        { status: 409 }
      );
    }

    // Stock validation
    for (const p of products) {
      const need = qtyByProduct.get(p.id)!;
      if (p.stock < need) {
        return NextResponse.json(
          { error: `Stok "${p.name}" tidak mencukupi (sisa ${p.stock})` },
          { status: 409 }
        );
      }
    }

    const orderStoreId = products[0].storeId;

    // QRIS manual hanya boleh dipakai bila penjual mengaktifkan QRIS
    if (paymentMethod === "QRIS") {
      const orderStore = await db.store.findUnique({
        where: { id: orderStoreId },
        select: { qrisEnabled: true, qrisImageUrl: true },
      });
      if (!orderStore || (!orderStore.qrisEnabled && !orderStore.qrisImageUrl)) {
        return NextResponse.json(
          { error: "Penjual belum mengaktifkan QRIS. Gunakan metode TUNAI atau hubungi penjual." },
          { status: 400 }
        );
      }
    }

    const order = await db.$transaction(async (tx) => {
      const totalPrice = products.reduce(
        (sum, p) => sum + p.price * qtyByProduct.get(p.id)!,
        0
      );
      const quantity = [...qtyByProduct.values()].reduce((a, b) => a + b, 0);

      // Anti dobel-pakai bukti: satu kode referensi hanya boleh menempel
      // pada satu pesanan yang masih aktif/terbayar (cek atomik di dalam transaksi).
      if (refCode) {
        const dup = await tx.payment.findFirst({
          where: { reference: refCode, status: { in: ["PENDING", "PAID"] } },
          select: { id: true },
        });
        if (dup) throw new DuplicateReferenceError();
      }

      const created = await tx.order.create({
        data: {
          code: generateOrderCode(),
          user: { connect: { id: userId } },
          store: { connect: { id: orderStoreId } },
          quantity,
          totalPrice,
          paymentMethod,
          status: "PENDING",
          ...(orderNote ? { note: orderNote } : {}),
          items: {
            create: products.map((p) => ({
              product: { connect: { id: p.id } },
              name: p.name,
              price: p.price,
              quantity: qtyByProduct.get(p.id)!,
              emoji: p.emoji,
              imageUrl: p.imageUrl,
            })),
          },
        },
        include: { items: true, store: true },
      });

      for (const p of products) {
        const need = qtyByProduct.get(p.id)!;
        await tx.product.update({
          where: { id: p.id },
          data: { sold: { increment: need }, stock: { decrement: need } },
        });
      }

      // Bukti bayar QRIS manual — langsung menempel saat pesanan dibuat:
      // status PENDING (menunggu verifikasi penjual), lalu penjual konfirmasi
      // via PATCH /api/payment/[id].
      if (paymentMethod === "QRIS" && refCode) {
        await tx.payment.create({
          data: {
            orderId: created.id,
            gateway: "manual",
            reference: refCode,
            amount: totalPrice,
            status: "PENDING",
          },
        });
      }

      return created;
    });

    // Kembalikan order lengkap dgn payment (agar UI langsung tahu status bukti)
    const full = await db.order.findUnique({
      where: { id: order.id },
      include: {
        items: true,
        store: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

    return NextResponse.json({ order: full });
  } catch (error) {
    if (error instanceof DuplicateReferenceError) {
      return NextResponse.json(
        { error: "Kode referensi ini sudah tercatat di pesanan lain. Setiap transaksi punya kode unik — salin kode dari pembayaran untuk pesanan ini." },
        { status: 409 }
      );
    }
    console.error("Create order error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

/**
 * DELETE /api/orders?userId=xxx — hapus SEMUA riwayat pesanan pembeli.
 * Soft delete (buyerDeletedAt): pesanan menghilang dari riwayat pembeli,
 * tetapi tetap terlihat di dashboard penjual sebagai catatan transaksi.
 * Hanya pesanan yang sudah selesai/dibatalkan yang bisa dihapus.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });
    }

    const result = await db.order.updateMany({
      where: {
        userId,
        status: { in: ["COMPLETED", "CANCELLED"] },
        buyerDeletedAt: null,
      },
      data: { buyerDeletedAt: new Date() },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error("Clear order history error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
