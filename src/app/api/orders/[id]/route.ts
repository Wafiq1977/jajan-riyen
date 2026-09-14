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
            amount: true,
            status: true,
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
