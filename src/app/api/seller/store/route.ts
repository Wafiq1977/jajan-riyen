import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * PATCH /api/seller/store
 * Update store profile: logo, banner, QRIS payment settings.
 */
export async function PATCH(req: NextRequest) {
  try {
    const {
      storeId,
      name,
      description,
      address,
      logoUrl,
      bannerUrl,
      qrisEnabled,
      qrisImageUrl,
      qrisCode,
    } = await req.json();

    if (!storeId) {
      return NextResponse.json({ error: "storeId wajib dikirim" }, { status: 400 });
    }

    const store = await db.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return NextResponse.json({ error: "Toko tidak ditemukan" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (typeof name === "string" && name.trim()) data.name = name.trim().slice(0, 60);
    if (typeof description === "string") data.description = description.trim() || null;
    if (typeof address === "string") data.address = address.trim() || null;
    if (typeof logoUrl === "string" || logoUrl === null) data.logoUrl = logoUrl || null;
    if (typeof bannerUrl === "string" || bannerUrl === null) data.bannerUrl = bannerUrl || null;
    if (typeof qrisEnabled === "boolean") data.qrisEnabled = qrisEnabled;
    if (typeof qrisImageUrl === "string" || qrisImageUrl === null)
      data.qrisImageUrl = qrisImageUrl || null;
    if (typeof qrisCode === "string") data.qrisCode = qrisCode.trim() || null;

    // Enable QRIS only makes sense when there is an image or a code to show
    if (data.qrisEnabled === true && !store.qrisImageUrl && !data.qrisImageUrl && !store.qrisCode && !data.qrisCode) {
      return NextResponse.json(
        { error: "Unggah gambar QRIS atau isi kode QRIS dulu sebelum mengaktifkan" },
        { status: 400 }
      );
    }

    const updated = await db.store.update({ where: { id: storeId }, data });

    const freshUser = await db.user.findUnique({
      where: { id: updated.userId },
      include: { store: true },
    });

    return NextResponse.json({ store: updated, user: freshUser });
  } catch (error) {
    console.error("Update store error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
