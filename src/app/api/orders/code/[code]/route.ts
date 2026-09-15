import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/orders/code/[code]
 * Look up an order by its public tracking code (JR-XXXXXX) for barcode scan.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const normalized = decodeURIComponent(code).trim().toUpperCase();

    const order = await db.order.findUnique({
      where: { code: normalized },
      include: {
        items: true,
        store: { select: { id: true, name: true, category: true, logoUrl: true } },
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
      return NextResponse.json({ error: "Kode pesanan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Get order by code error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
