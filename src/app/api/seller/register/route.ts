import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/seller/register
 * Pendaftaran penjual dengan DATA PRIBADI LENGKAP (wajib):
 *  - Nama lengkap sesuai KTP + NIK 16 digit + alamat KTP
 *  - Lokasi toko: koordinat dari peta / share lokasi Google Maps
 */
export async function POST(req: NextRequest) {
  try {
    const {
      userId,
      name,
      category,
      description,
      address,
      logoUrl,
      bannerUrl,
      // data pribadi (wajib)
      ktpName,
      nik,
      ownerAddress,
      // lokasi toko (wajib)
      latitude,
      longitude,
    } = await req.json();

    if (!userId || !name || typeof name !== "string") {
      return NextResponse.json({ error: "Nama toko wajib diisi" }, { status: 400 });
    }
    if (!ktpName || typeof ktpName !== "string" || ktpName.trim().length < 3) {
      return NextResponse.json({ error: "Nama lengkap sesuai KTP wajib diisi" }, { status: 400 });
    }
    if (!nik || !/^\d{16}$/.test(String(nik).replace(/\D/g, ""))) {
      return NextResponse.json({ error: "NIK harus 16 digit angka" }, { status: 400 });
    }
    if (!ownerAddress || String(ownerAddress).trim().length < 10) {
      return NextResponse.json({ error: "Alamat lengkap sesuai KTP wajib diisi" }, { status: 400 });
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
      return NextResponse.json(
        { error: "Lokasi toko wajib diisi — pin peta atau tempel link Google Maps" },
        { status: 400 }
      );
    }
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return NextResponse.json({ error: "Koordinat tidak valid" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId }, include: { store: true } });
    if (!user) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    }
    if (user.store) {
      return NextResponse.json({ error: "Kamu sudah terdaftar sebagai penjual" }, { status: 409 });
    }

    const nikClean = String(nik).replace(/\D/g, "");

    const [store] = await db.$transaction([
      db.store.create({
        data: {
          userId,
          name: name.trim(),
          category: category || "Makanan",
          description: description?.trim() || null,
          address: address?.trim() || null,
          latitude: lat,
          longitude: lng,
          logoUrl: typeof logoUrl === "string" && logoUrl ? logoUrl : null,
          bannerUrl: typeof bannerUrl === "string" && bannerUrl ? bannerUrl : null,
        },
      }),
      db.user.update({
        where: { id: userId },
        data: {
          isSeller: true,
          name: ktpName.trim(),
          nik: nikClean,
          address: ownerAddress.trim(),
        },
      }),
    ]);

    const freshUser = await db.user.findUnique({
      where: { id: userId },
      include: { store: true },
    });

    return NextResponse.json({ store, user: freshUser });
  } catch (error) {
    console.error("Seller register error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
