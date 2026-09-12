import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";

    const stores = await db.store.findMany({
      where: {
        AND: [
          q
            ? {
                OR: [
                  { name: { contains: q } },
                  { description: { contains: q } },
                  { category: { contains: q } },
                  { products: { some: { name: { contains: q } } } },
                ],
              }
            : {},
          category ? { category } : {},
        ],
      },
      include: { products: true },
      orderBy: { rating: "desc" },
    });

    return NextResponse.json({ stores });
  } catch (error) {
    console.error("Get stores error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
