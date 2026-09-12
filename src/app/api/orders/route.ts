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
      where: userId ? { userId } : { storeId: storeId! },
      include: {
        items: true,
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
    const { userId, storeId, paymentMethod, items } = (await req.json()) as {
      userId: string;
      storeId?: string;
      paymentMethod: string;
      items: IncomingItem[];
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

    const order = await db.$transaction(async (tx) => {
      const totalPrice = products.reduce(
        (sum, p) => sum + p.price * qtyByProduct.get(p.id)!,
        0
      );
      const quantity = [...qtyByProduct.values()].reduce((a, b) => a + b, 0);

      const created = await tx.order.create({
        data: {
          code: generateOrderCode(),
          user: { connect: { id: userId } },
          store: { connect: { id: orderStoreId } },
          quantity,
          totalPrice,
          paymentMethod,
          status: "PENDING",
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

      return created;
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
