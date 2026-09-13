# ☁️ PANDUAN CLOUDINARY — Upload Gambar di Vercel (Gratis)

> Untuk kamu yang **tetap ingin di Vercel** tanpa bayar. Filesystem Vercel read-only,
> jadi gambar disimpan ke **Cloudinary** (free tier, tanpa kartu kredit) — kode sudah
> saya siapkan: begitu 3 env vars terpasang, upload otomatis pindah ke cloud.

---

## Cara Kerjanya (sudah jalan otomatis)

`src/app/api/upload/route.ts` sekarang punya 2 mode:

| Kondisi | Mode | Dipakai di |
|---|---|---|
| Env Cloudinary **terisi** | ☁️ Gambar → `res.cloudinary.com` | **Vercel** |
| Env Cloudinary **kosong** | 💾 Gambar → `public/uploads/` | Sandbox, VPS, Railway+Volume |

Jadi menambah Cloudinary **tidak merusak apa pun** di environment lain.

---

## Langkah 1 — Daftar Cloudinary (2 menit, gratis)

1. Buka **https://cloudinary.com/users/register_free**
2. Daftar (email saja — **tanpa kartu kredit**)
3. Setelah masuk, buka **Dashboard** (halaman awal setelah login)

**Kuota gratis:** 25 kredit/bulan ≈ 25 GB bandwidth/gabungan penyimpanan.
Untuk aplikasi UMKM kecil (gambar < 5 MB) ini **sangat cukup**.

## Langkah 2 — Ambil 3 Kode dari Dashboard

Di halaman Dashboard (bagian **API Keys** / "Product Environment Credentials"):

| Env Var | Ambil dari |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | **Cloud name** (contoh: `dx7abcxyz`) |
| `CLOUDINARY_API_KEY` | **API Key** (angka) |
| `CLOUDINARY_API_SECRET` | **API Secret** (klik 👁 *reveal* → copy) |

## Langkah 3 — Pasang di Vercel

1. Buka **https://vercel.com** → project **jajan-riyen**
2. **Settings → Environment Variables**
3. Tambahkan 3 variabel di atas (environment: *Production, Preview, Development*)
4. **Tab Deployments → ⋯ (deploy teratas) → Redeploy** → tunggu ±1 menit

> Kode peng-upload-nya sudah saya push ke GitHub, jadi setelah redeploy langsung aktif.

## Langkah 4 — Uji

1. Buka aplikasimu → login → mode penjual
2. Upload **logo toko / banner / foto produk / gambar QRIS**
3. Berhasil = URL gambarnya berupa `https://res.cloudinary.com/...` ✅
4. Redeploy lagi sekali → gambar **tetap ada** (tersimpan di cloud, bukan server)

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| Upload gagal, pesan *cloud* | Cek 3 env vars sudah terpasang & sudah **Redeploy** setelahnya |
| `Cloudinary 401` / `Invalid signature` | `CLOUDINARY_API_SECRET` salah — copy ulang dari Dashboard (hati-hati spasi) |
| `Cloudinary 401` api_key | `CLOUDINARY_API_KEY` salah |
| Gambar tidak tampil | Tunggu 1-2 detik (CDN), refresh; cek URL di kolom produk |
| Kuota habis (jarang) | Bulan baru kredit kembali 25; atau hapus asset tak terpakai di Dashboard → Media Library |

---

## Bonus: Alternatif 100% Tanpa Daftar Akun Baru

Gambar bisa juga disimpan **langsung di database Neon** (kolom bytea, dilayani lewat
API `/api/files/<id>`) — gratis, tanpa akun baru, tapi memakan kuota storage Neon
(0.5 GB) dan sedikit lebih lambat. Mau dipasangkan? Tinggal bilang ke assistant. 😉

---

*Panduan ini melengkapi `PANDUAN-DEPLOY.md` bagian 6. Dibuat otomatis oleh Z.ai Code.*
