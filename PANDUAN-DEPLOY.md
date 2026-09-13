# 📦 PANDUAN DEPLOY & PUBLISH — Aplikasi Jajan Riyen

Panduan lengkap: dari kode → server online → diinstall di HP → sampai jadi APK / masuk Play Store.

---

## DAFTAR ISI

1. [Persiapan (sekali saja)](#1-persiapan)
2. [Aktifkan OTP WhatsApp/SMS beneran](#2-aktifkan-otp-whatsapp-sms)
3. [Pilih cara deploy](#3-pilih-cara-deploy)
   - Opsi A — VPS (paling direkomendasikan)
   - Opsi B — Vercel (paling gampang, database online)
   - Opsi C — Railway (middle ground)
4. [Install aplikasi di HP (PWA — gratis, tanpa Play Store)](#4-install-aplikasi-di-hp-pwa)
5. [Jadikan APK / AAB & publish ke Play Store](#5-jadikan-apk--aab--publish-ke-play-store)
6. [Daftar variabel .env](#6-daftar-variabel-env)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. PERSIAPAN

### Yang dibutuhkan
- Akun **GitHub** (gratis) — https://github.com
- Node.js **20+** di komputermu — https://nodejs.org
- (Opsional) VPS / akun Vercel / Railway — lihat bagian 3

### Unggah kode ke GitHub

```bash
cd my-project                # folder aplikasi Jajan Riyen
git init
git add .
git commit -m "Jajan Riyen v3"
git branch -M main
# buat repo kosong di github.com dulu (contoh: usernamu/jajan-riyen), lalu:
git remote add origin https://github.com/usernamu/jajan-riyen.git
git push -u origin main
```

> ⚠️ **Jangan commit file `.env`** (sudah ada di .gitignore). Isi kredensial diatur di server nanti.

---

## 2. AKTIFKAN OTP WHATSAPP/SMS

Saat ini kode verifikasi berjalan dalam **mode pengembangan** (kode tampil di layar). Untuk pengiriman beneran, daftar salah satu gateway berikut lalu isi token di `.env` server:

### Pilihan 1 — Fonnte (WhatsApp, paling gampang & murah) ⭐
1. Daftar di **https://fonnte.com** (gratis untuk kuota dasar)
2. Login dashboard → hubungkan nomor WhatsAppmu (scan QR seperti WhatsApp Web)
3. Salin **Token** dari dashboard
4. Isi di `.env`:
   ```
   FONNTE_TOKEN=ISI_TOKEN_FONNTE_DISINI
   OTP_SALT=teks-rahasia-bebas-panjang
   ```

### Pilihan 2 — Wablas (WhatsApp)
1. Daftar di **https://wablas.com** → dapat token + domain server
2. Isi di `.env`:
   ```
   WABLAS_TOKEN=ISI_TOKEN_WABLAS
   WABLAS_DOMAIN=https://yourdomain.wablas.com
   OTP_SALT=teks-rahasia-bebas
   ```

### Pilihan 3 — Twilio (SMS internasional, paling stabil)
1. Daftar di **https://www.twilio.com** → beli nomor SMS
2. Isi di `.env`:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxx
   TWILIO_FROM=+1xxxxxxxxxx
   OTP_SALT=teks-rahasia-bebas
   ```

> Setelah token diisi & server di-restart, kode OTP **hanya dikirim** ke WhatsApp/SMS pemilik nomor — tidak pernah tampil di aplikasi. Fitur keamanan yang sudah aktif otomatis: kode ter-hash di database, kedaluwarsa 5 menit, maksimal 5 kali salah, maksimal 5 permintaan kode per jam, satu kode hanya bisa dipakai sekali.

---

## 3. PILIH CARA DEPLOY

| | Opsi A: VPS | Opsi B: Vercel | Opsi C: Railway |
|---|---|---|---|
| Biaya | ± Rp60–100rb/bln | Gratis (Hobby) | ± $5/bln |
| Database SQLite lokal | ✅ persisten | ❌ ganti Postgres (Neon) | ✅ volume persisten |
| Upload foto (logo/banner/QRIS/produk) | ✅ | ⚠️ perlu Cloudinary | ✅ |
| Kamera & GPS (HTTPS) | ✅ | ✅ | ✅ |
| Kesulitan | Sedang | Mudah | Mudah |
| Cocok untuk | Produksi serius | Coba-coba cepat | Produksi simpel |

> 📷 **PENTING:** Kamera scan & GPS hanya jalan di **HTTPS**. Ketiga opsi di atas sudah menyediakan HTTPS otomatis.
>
> 🏆 **Rekomendasi agar 100% fitur berfungsi tanpa ubah kode:** pilih **VPS (Opsi A)** atau **Railway (Opsi C)** — database & upload foto langsung jalan. Vercel cocok untuk demo cepat, tapi butuh penyesuaian database + penyimpanan gambar.

---

### OPSI A — Deploy ke VPS (Niagahoster/Hostinger/DigitalOcean)

**A1. Sewa VPS** (Ubuntu 22.04, minimal 1 GB RAM) dan catat IP publiknya.

**A2. Setup server:**
```bash
ssh root@IP_SERVER

# install Node 20 + pm2 + nginx + certbot
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx certbot python3-certbot-nginx
npm install -g pm2 bun

# install database SQLite build dependencies
apt install -y build-essential
```

**A3. Clone & build aplikasi:**
```bash
cd /var/www
git clone https://github.com/usernamu/jajan-riyen.git
cd jajan-riyen

# buat file .env
cat > .env << 'EOF'
DATABASE_URL=file:/var/www/jajan-riyen/db/custom.db
FONNTE_TOKEN=token_fonnte_mu
OTP_SALT=teks_rahasia_mu
EOF

bun install                # atau: npm install
bun run db:push            # buat tabel database
bunx tsx prisma/seed.ts    # (opsional) isi data toko & produk contoh
bun run build              # build produksi
pm2 start "bun run start" --name jajanriyen   # jalan di port 3000
pm2 save && pm2 startup    # auto-start saat server reboot
```

**A4. Hubungkan domain + HTTPS:**
1. Di pengaturan domainmu (mis. Cloudflare/Niagahoster), arahkan **A record**: `jajanmu.com → IP_SERVER`
2. Konfigurasi nginx:
```nginx
# /etc/nginx/sites-available/jajanriyen
server {
    listen 80;
    server_name jajanmu.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
```bash
ln -s /etc/nginx/sites-available/jajanriyen /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d jajanmu.com    # HTTPS otomatis, gratis
```

Selesai! Aplikasi live di `https://jajanmu.com` 🎉

---

### OPSI B — Deploy ke Vercel (paling cepat)

Database SQLite berbasis file **tidak bisa** dipakai di Vercel (filesystem hanya-baca, isinya hilang setiap deploy). Jadi pindah ke **Postgres cloud gratis dari Neon**:

**B1. Siapkan database Neon (gratis, tanpa kartu kredit):**
1. Daftar di **https://neon.tech** → buat project baru
2. Salin **Connection String** (bentuknya `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)

**B2. Ubah provider Prisma** di `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```
Lalu di komputermu:
```bash
# sementara arahkan DATABASE_URL di .env ke connection string Neon
bun run db:generate
bun run db:push            # tabel dibuat langsung di Neon
```

> 📌 Alternatif Postgres gratis lain: **Supabase** (Settings → Database → Connection string) — langkahnya sama persis.

**B3. Import ke Vercel:**
1. Buka **https://vercel.com/new** → pilih repo `jajan-riyen`
2. **Build Command** → isi manual: `prisma generate && next build`
3. **Environment Variables** → tambahkan `DATABASE_URL` (connection string Neon), `FONNTE_TOKEN`, `OTP_SALT`
4. Klik **Deploy** — selesai! URL: `https://jajan-riyen.vercel.app`
5. (Opsional) Custom domain: Settings → Domains

> ⚠️ **Keterbatasan Vercel:** fitur upload foto (logo/banner/produk/QRIS) menulis ke disk, sedangkan filesystem Vercel **read-only** — upload akan gagal dengan error di log. Solusi: pindahkan penyimpanan ke **Cloudinary/UploadThing** (ubah `src/app/api/upload/route.ts` untuk kirim ke cloud dan simpan URL-nya), atau pilih VPS/Railway agar fitur ini langsung jalan tanpa ubah kode.

---

### OPSI C — Deploy ke Railway

1. Buka **https://railway.app** → New Project → Deploy from GitHub → pilih `jajan-riyen`
2. Tambahkan **Volume** (untuk file SQLite): mount ke `/app/db`
3. Variables → tambahkan `DATABASE_URL=file:/app/db/custom.db`, `FONNTE_TOKEN`, `OTP_SALT`
4. Settings → Networking → **Generate Domain** → Railway memberi HTTPS otomatis

---

## 4. INSTALL APLIKASI DI HP (PWA)

Aplikasi ini sudah **PWA lengkap** (manifest + ikon + service worker + splash) — bisa di-*install* seperti aplikasi asli **tanpa Play Store**:

### Android (Chrome)
1. Buka `https://domainmu.com` di Chrome
2. Menu **⋮** (kanan atas) → **"Install aplikasi"** / **"Tambahkan ke layar utama"**
3. Icon Jajan Riyen muncul di home screen — fullscreen, ada splash screen, seperti aplikasi native ✅

### iPhone/iPad (Safari)
1. Buka `https://domainmu.com` di Safari
2. Tombol **Bagikan** (kotak dengan panah ↑) → **"Tambahkan ke Layar Utama"** → Tambah

### Cara cepat dari dalam aplikasi
Tab **Akun → "Install Aplikasi di HP"** — aplikasi otomatis mendeteksi HP pengunjung dan menampilkan tombol pasang + panduan.

> Syarat agar tombol "Pasang Sekarang" (instalasi otomatis) muncul: situs harus **HTTPS** dan service worker aktif — keduanya sudah tertangani oleh deployment di bagian 3.

---

## 5. JADIKAN APK / AAB & PUBLISH KE PLAY STORE

### Cara 1 — PWABuilder (paling mudah, gratis) ⭐
1. Buka **https://www.pwabuilder.com**
2. Masukkan URL aplikasimu (`https://domainmu.com`) → **Start**
3. Setelah analisis selesai → **Package for stores** → pilih **Android**
4. Unduh paket → berisi:
   - `app-release-signed.apk` → **langsung bisa dibagikan ke HP** (kirim via WhatsApp/Drive → install)
   - `app-release-bundle.aab` → untuk Play Store

### Cara 2 — Bubblewrap CLI (kontrol penuh)
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://domainmu.com/manifest.webmanifest
bubblewrap build
# hasil: app-release-signed.apk + app-release-bundle.aab
```

### Publish ke Google Play Store
1. Daftar akun Google Play Developer: **$25 sekali seumur hidup** → https://play.google.com/console
2. Buat aplikasi baru → unggah file **.aab** dari PWABuilder/Bubblewrap
3. Lengkapi: judul, deskripsi, screenshot (ambil dari HP), ikon 512×512 (sudah tersedia di `public/icons/icon-512.png`)
4. Kirim untuk **review** (biasanya 1–7 hari) → tayang 🎉

### Publish ke App Store (iOS)
Gunakan paket iOS dari PWABuilder (perlu Mac + akun Apple Developer $99/tahun), atau biarkan pengguna iPhone install via Safari (bagian 4).

---

## 6. DAFTAR VARIABEL .ENV

```env
# WAJIB
DATABASE_URL=file:/absolut/path/ke/db/custom.db

# OTP WhatsApp/SMS — isi SALAH SATU (lihat bagian 2)
FONNTE_TOKEN=
WABLAS_TOKEN=
WABLAS_DOMAIN=https://console.wablas.com
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=

# KEAMANAN OTP (disarankan diisi dengan teks acak panjang)
OTP_SALT=
```

> 📌 **Catatan upload:** foto logo/banner/produk/QRIS yang diunggah penjual disimpan ke folder `public/uploads/` oleh `src/app/api/upload/route.ts` (maks 5 MB, format PNG/JPG/WebP/GIF). Di **VPS/Railway** langsung jalan. Di **Vercel** filesystem read-only — gunakan Cloudinary/S3 (ubah route tersebut untuk kirim ke cloud, simpan URL-nya).

---

## 7. TROUBLESHOOTING

| Masalah | Penyebab & Solusi |
|---|---|
| Kamera scan tidak jalan di HP | Situs belum **HTTPS**, atau izin kamera ditolak. Cek lock 🔒 di address bar. |
| GPS tidak terdeteksi | Sama — butuh HTTPS + izin lokasi. Pengguna masih bisa pilih area manual. |
| Kode OTP tidak sampai | Token gateway belum diisi/salah, atau kuota Fonnte/Wablas habis. Cek log server: `pm2 logs jajanriyen`. |
| "Terlalu banyak permintaan kode" | Batas 5 kode/jam per nomor (proteksi spam) — tunggu atau restart tidak menghapus batas ini (tersimpan di DB). |
| Barcode tidak bisa discan penjual | Pastikan penjual pakai tombol **Scan Barcode Pembeli** di Dashboard Penjual, kamera menghadap barcode pembeli di layar. |
| Gambar upload hilang di Vercel | Filesystem Vercel read-only — pakai Cloudinary (bagian 6). |
| Database error setelah update | Jalankan `bun run db:push` di server untuk menyamakan skema. |

---

## ✅ CHECKLIST GO-LIVE

- [ ] Kode ter-push ke GitHub
- [ ] Deploy (VPS/Vercel/Railway) dengan HTTPS aktif
- [ ] `.env` berisi `DATABASE_URL` + `FONNTE_TOKEN` + `OTP_SALT`
- [ ] `bun run db:push` sukses, toko demo tampil
- [ ] Tes login: OTP terkirim ke WhatsApp asli
- [ ] Tes daftar penjual: NIK + pin peta + upload logo berfungsi
- [ ] Tes scan: barcode pembeli dipindai dashboard penjual
- [ ] Install PWA di HP pribadi → icon muncul, fullscreen
- [ ] (Opsional) Build APK via PWABuilder → bagikan / publish Play Store

**Selamat, Jajan Riyen siap dipakai publik! 🌿**
