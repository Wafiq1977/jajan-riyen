import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const {
      storeId,
      name,
      description,
      price,
      originalPrice,
      category,
      stock,
      emoji,
      imageUrl,
      isFlashSale,
    } = await req.json();

    if (!storeId || !name || typeof name !== "string" || !price || price <= 0) {
      return NextResponse.json(
        { error: "Nama produk dan harga yang valid wajib diisi" },
        { status: 400 }
      );
    }

    const store = await db.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return NextResponse.json({ error: "Toko tidak ditemukan" }, { status: 404 });
    }

    const product = await db.product.create({
      data: {
        storeId,
        name: name.trim(),
        description: description?.trim() || null,
        price: Math.round(price),
        originalPrice: originalPrice && originalPrice > price ? Math.round(originalPrice) : null,
        category: category || store.category || "Makanan",
        stock: typeof stock === "number" && stock >= 0 ? Math.round(stock) : 50,
        emoji: emoji || "🍽️",
        imageUrl: imageUrl || null,
        isFlashSale: Boolean(isFlashSale),
      },
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
