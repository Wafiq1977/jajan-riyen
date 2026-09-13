# 🚂 PANDUAN DEPLOY KE RAILWAY — Jajan Riyen

> **Kenapa Railway?** Semua fitur jalan **100% tanpa ubah kode**, termasuk **upload gambar**
> (logo/banner/produk/QRIS) berkat *persistent volume*. HTTPS otomatis → kamera scan QR,
> GPS, dan install PWA langsung berfungsi.
>
> *Alternatif:* tetap di Vercel + pindahkan penyimpanan gambar ke Cloudinary/UploadThing
> (gratis, tapi perlu ubah kode `src/app/api/upload/route.ts` + daftar akun cloud).

---

## 0. Ringkasan & Biaya

| Item | Keterangan |
|---|---|
| Database | **Tetap pakai Neon Postgres** yang sudah berisi data — tidak perlu migrasi ulang |
| Biaya Railway | Trial: **$5 kredit sekali** (perlu verifikasi akun). Lanjutan: Hobby **$5/bulan** |
| Estimasi pakai app ini | ± $5/bulan (1 service + 1 volume kecil) |
| Waktu pengerjaan | ± 10 menit |

---

## 1. Prasyarat — sudah terpenuhi ✅

- [x] Repo GitHub: `Wafiq1977/jajan-riyen` (kode + skema Postgres + seed)
- [x] Database Neon aktif, berisi 5 toko demo
- [x] Token Fonnte (WhatsApp OTP)
- [x] OTP_SALT

> 💡 **Nilai ketiga env nanti tinggal disalin dari Vercel**:
> Vercel → project `jajan-riyen` → Settings → Environment Variables.

---

## 2. Buat Project di Railway

1. Buka **https://railway.app** → **Login with GitHub** (izinkan akses repo)
2. Jika diminta verifikasi (nomor HP/ID) → ikuti, agar dapat trial $5
3. **New Project** → **Deploy from GitHub repo** → pilih **`jajan-riyen`**
4. Deploy pertama boleh dibiarkan — kita atur settings dulu di langkah berikutnya

---

## 3. Atur Build & Start Command (PENTING ⚠️)

Build bawaan repo memakai mode *standalone* + `bun`. Untuk Railway kita pakai cara
paling sederhana supaya **folder `public/uploads/` dilayani langsung dari disk**
(sehingga gambar yang di-upload tersimpan di Volume dan langsung tampil):

**Klik service `jajan-riyen` → tab Settings:**

| Pengaturan | Nilai |
|---|---|
| **Build Command** (Custom) | `npx prisma generate && npx next build` |
| **Start Command** (Custom) | `npx next start` |
| Install Command | biarkan default |

> Jangan pakai `npm run build` bawaan repo di Railway — itu untuk mode standalone.

---

## 4. Isi Environment Variables

**Tab Variables → Raw Editor** → tempel 3 baris ini (isi dengan nilai aslimu dari Vercel):

```
DATABASE_URL=postgresql://<user>:<password>@ep-xxx-pooler.<region>.aws.neon.tech/neondb?sslmode=require&channel_binding=require
FONNTE_TOKEN=<token fonnte dari md.fonnte.com>
OTP_SALT=<salt acak yang sudah kamu buat>
```

> ⚠️ `DATABASE_URL` **harus** URL Neon (yang ada `-pooler`-nya) — sama persis dengan yang
> dipakai di Vercel. Railway otomatis redeploy setiap kali Variables diubah.

---

## 5. Tambahkan Volume (agar upload gambar permanen 🖼️)

1. **Klik service → tab Volumes → + New Volume**
2. **Mount path**: `/app/public/uploads`
3. **Add Volume** → service akan redeploy otomatis

Semua foto yang di-upload penjual (logo toko, banner, produk, QRIS) ditulis ke folder
tersebut, dan **isi Volume tidak hilang walau redeploy berulang kali**.

---

## 6. Aktifkan Domain HTTPS

**Settings → Networking → Generate Domain** → Railway memberi URL, contoh:

```
https://jajan-riyen.up.railway.app
```

HTTPS aktif otomatis → kamera (scan QR), lokasi (GPS), dan tombol **Install Aplikasi**
(PWA) langsung berfungsi.

---

## 7. Checklist Verifikasi Setelah Deploy

- [ ] Buka domain Railway → **5 toko demo tampil**
- [ ] Login dengan **nomor WhatsApp asli** → kode masuk ke WA → berhasil masuk
- [ ] Masuk sebagai penjual → upload logo/produk → **gambar tampil**
- [ ] **Redeploy** (Deployments → Redeploy) → gambar yang tadi di-upload **masih ada** ✅
- [ ] Di HP: tab Akun → **Install Aplikasi** → PWA terpasang

---

## 8. Setelah Railway Jalan

- **Vercel**: boleh dihapus (project → Settings → Delete) atau dibiarkan sebagai cadangan.
  Kedua platform aman berbagi satu database Neon.
- **Domain sendiri** (opsional): Settings → Networking → **Custom Domain** → tambahkan
  CNAME `<nama>.up.railway.app` di DNS domainmu.

---

## 9. Troubleshooting

| Masalah | Penyebab & Solusi |
|---|---|
| Build gagal: `prisma: not found` | Build Command belum diubah — pakai persis seperti bagian 3 |
| Deploy sukses tapi *Application failed to respond* | Start Command salah — pastikan `npx next start`; cek tab **Logs** |
| 500 saat minta kode OTP | `DATABASE_URL` salah/salah tempel — harus URL Neon `-pooler`; cek 3 Variables lengkap |
| OTP terkirim tapi kode salah | Device Fonnte offline — cek **md.fonnte.com**, scan ulang QR bila perlu |
| Gambar hilang setelah redeploy | Volume belum terpasang di `/app/public/uploads` (bagian 5) |
| Upload gagal > 5 MB | Batas memang 5 MB (PNG/JPG/WebP/GIF) — kompres dulu gambarnya |

---

*Panduan ini melengkapi `PANDUAN-DEPLOY.md` (Opsi C). Dibuat otomatis oleh Z.ai Code.*
