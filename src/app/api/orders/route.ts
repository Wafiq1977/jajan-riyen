import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function generateOrderCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "TSK-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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
      where: userId ? { userId } : { storeId: storeId! },
      include: {
        product: true,
        store: true,
        user: { select: { id: true, phone: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Get orders error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, productId, quantity, paymentMethod } = await req.json();

    if (!userId || !productId || !quantity || quantity < 1) {
      return NextResponse.json({ error: "Data pesanan tidak lengkap" }, { status: 400 });
    }
    if (paymentMethod !== "TUNAI" && paymentMethod !== "QRIS") {
      return NextResponse.json({ error: "Metode pembayaran tidak valid" }, { status: 400 });
    }

    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    }
    if (product.stock < quantity) {
      return NextResponse.json({ error: "Stok tidak mencukupi" }, { status: 409 });
    }

    const order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          code: generateOrderCode(),
          userId,
          productId,
          storeId: product.storeId,
          quantity,
          totalPrice: product.price * quantity,
          paymentMethod,
          status: "PENDING",
        },
        include: { product: true, store: true },
      });

      await tx.product.update({
        where: { id: productId },
        data: {
          sold: { increment: quantity },
          stock: { decrement: quantity },
        },
      });

      return created;
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
