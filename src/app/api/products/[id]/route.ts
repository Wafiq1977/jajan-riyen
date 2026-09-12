import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingOrders = await db.orderItem.count({ where: { productId: id } });
    if (existingOrders > 0) {
      return NextResponse.json(
        { error: "Produk memiliki riwayat pesanan, tidak dapat dihapus" },
        { status: 409 }
      );
    }

    await db.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
