# 💳 Panduan QRIS Otomatis — Jajan Riyen (Midtrans PRODUKSI)

Pembayaran QRIS dinamis sudah **terpasang lengkap** di aplikasi: buyer checkout → QRIS
sesuai total tampil → buyer scan & bayar → **payment gateway mengirim webhook** → status
pesanan berubah otomatis menjadi **"Pembayaran Berhasil"**.

## ⚡ STATUS SAAT INI — MODE PRODUKSI (uang asli)

Aplikasi sudah **dialihkan penuh ke Midtrans PRODUKSI** (tidak memakai sandbox lagi):

| item | status |
|---|---|
| Server Key produksi (`Mid-server-dw70Jx…`) | ✅ **VALID** — auth ke `api.midtrans.com` sukses (dicek via API) |
| `MIDTRANS_IS_PRODUCTION=true` | ✅ terpasang di `.env` lokal |
| Route / konfigurasi kode | ✅ otomatis pakai `https://api.midtrans.com` (zero-config) |
| Badge **PRODUKSI** di layar QRIS | ✅ tampil (amber) — pembeda bahwa ini uang asli |
| Channel **QRIS** di akun produksi | ❌ **BELUM AKTIF** — charge ditolak `402 Payment channel is not activated` |
| Channel **GoPay** di akun produksi | ❌ **BELUM TERDAFTAR** — `404 Merchant pop id is not found` |

**Satu-satunya yang tersisa adalah aktivasi channel di akun produksi — hanya bisa
dikerjakan pemilik akun Midtrans (user), bukan dari kode.** Berbeda dengan sandbox,
aktivasi produksi **butuh persetujuan tim Midtrans** (bukan sekadar centang).

### Langkah aktivasi produksi (dikerjakan user):

1. Buka https://dashboard.midtrans.com → pastikan **data merchant lengkap & terverifikasi**
   (identitas + dokumen usaha + rekening bank). Channel tidak bisa menyala bila data
   akun belum diverifikasi.
2. **Settings → Payment** (menu "Payment" di sidebar — **BUKAN "Payment Link"**! Yang di
   Payment Link hanya berlaku untuk link manual, tidak untuk transaksi API/aplikasi) →
   aktifkan **QRIS** dan **GoPay**. Untuk akun produksi ini memicu proses review Midtrans.
3. **Bila toggle tidak tersedia / sudah dicentang tetapi charge tetap ditolak** → kirim
   email ke **support@midtrans.com** (template di bawah). Setelah di-acc, channel langsung nyala.
4. **Settings → Configuration → Payment Notification URL** (dashboard **produksi**) → isi:
   ```
   https://jajan-riyen.vercel.app/api/payment/webhook
   ```
5. Set env di **Vercel** (lihat langkah 3 di bawah) → **Redeploy**.
6. Uji: buat pesanan QRIS kecil (mis. Rp1.000–Rp10.000) → QR tampil (badge **PRODUKSI**)
   → scan & bayar dengan e-wallet sungguhan → status otomatis "Pembayaran Berhasil".

**Template email aktivasi channel produksi (kirim dari email terdaftar akun Midtrans):**

> **Subject:** Request aktivasi payment channel Core API — Produksi
>
> Halo tim Midtrans, saya ingin meminta aktivasi channel pembayaran **QRIS
> (acquirer GoPay)** dan **GoPay** untuk **Core API (/v2/charge)** pada akun
> **produksi** saya:
> - Email akun: (email login dashboard.midtrans.com)
> - MID: (lihat Dashboard → Settings → General Settings)
> - Error yang muncul: `402 Payment channel is not activated` saat charge
>   `payment_type=qris`, dan `404 Merchant pop id is not found` saat
>   `payment_type=gopay`
> - Data merchant sudah lengkap/terverifikasi; channel Core API belum tersedia.
>
> Terima kasih.

> 💡 Selama channel belum aktif: pesan error di layar QRIS sudah menjelaskan langkah
> aktivasi ini secara otomatis, dan metode **TUNAI tetap berfungsi normal**.

## Dua mode (otomatis, tanpa ubah kode)

| Mode | Kapan aktif | Cara bayar | Validasi |
|---|---|---|---|
| **DEMO** | Tidak ada `MIDTRANS_SERVER_KEY` di server | QR ditampilkan + tombol "Simulasi: Pembayaran Berhasil" | Jalur logika webhook yang sama (lokal) |
| **MIDTRANS (asli)** | `MIDTRANS_SERVER_KEY` terisi | Scan QRIS oleh semua e-wallet/m-banking | **Webhook Midtrans + signature sha512** |

> Saat mode asli aktif, tombol simulasi demo **otomatis mati (404)** — produksi hanya
> menerima validasi dari webhook gateway. Kredensial 100% di server, frontend hanya
> menerima gambar QR & status.

## Konfigurasi lingkungan

### 1. Server Key (sudah dipasang)
Dashboard → **Settings → Access Keys** → salin **Server Key** (produksi: `Mid-server-...`).
Key produksi tersimpan di `.env` (gitignored) dan sudah terverifikasi valid via API.

⚠️ **Peringatan format key**: server key sandbox akun Midtrans BARU juga berformat
`Mid-server-…` (identik dengan produksi, tanpa prefix `SB-`). Karena itu variabel
`MIDTRANS_IS_PRODUCTION` **wajib** diset eksplisit: `true` untuk produksi, `false`
untuk sandbox. Jangan andalkan prefix.

### 2. `.env` lokal (sudah diterapkan)
```
MIDTRANS_SERVER_KEY=Mid-server-dw70Jx…      # key produksi
MIDTRANS_IS_PRODUCTION=true                  # paksa ke api.midtrans.com
PAYMENT_EXPIRY_MINUTES=15                    # opsional
```

### 3. Vercel (WAJIB diset user + Redeploy)
Project `jajan-riyen` → **Settings → Environment Variables**:

| Name | Value |
|---|---|
| `MIDTRANS_SERVER_KEY` | `Mid-server-dw70Jx…` (key produksi, sama seperti `.env`) |
| `MIDTRANS_IS_PRODUCTION` | `true` |
| `PAYMENT_EXPIRY_MINUTES` | `15` (opsional) |

→ **Redeploy** (Deployments → terbaru → Redeploy) setiap kali env diubah.

### 4. Webhook produksi (WAJIB)
Dashboard **produksi** → **Settings → Configuration → Payment Notification URL**:
```
https://jajan-riyen.vercel.app/api/payment/webhook
```
Bila webhook belum terdaftar, fallback polling server tetap mendeteksi pembayaran
(maks. ±4 detik lebih lambat) — tapi daftarkan tetap untuk real-time.

### 5. Uji produksi
1. Buat pesanan QRIS kecil → QR tampil (badge **PRODUKSI** di header layar QRIS).
2. Scan & bayar **dengan uang sungguhan** (QRIS produksi diterima semua aplikasi:
   GoPay, OVO, DANA, ShopeePay, m-banking, dll).
3. Beberapa detik setelah bayar → **"Pembayaran Berhasil"** — webhook masuk;
   bila webhook belum terdaftar, fallback polling tetap mendeteksi.
4. Uji juga kedaluwarsa: biarkan QR 15 menit → status berubah **"Pembayaran Expired"**,
   buyer bisa buat QR baru.

## Keamanan yang sudah diterapkan

- ✅ Signature webhook diverifikasi `sha512(order_id + status_code + gross_amount + serverKey)` — payload palsu ditolak **403** (diuji dengan key asli).
- ✅ Nominal webhook dicocokkan dengan tagihan — notifikasi nominal beda diabaikan (diuji).
- ✅ Anti-regresi status: `PAID` tidak bisa diturunkan oleh notifikasi lain; `EXPIRED` yang ternyata terbayar tetap dinaikkan ke `PAID` (gateway = sumber kebenaran).
- ✅ Idempoten: settlement berulang aman (diuji); satu order tidak bisa ter-charge ganda; `reference` transaksi **unique** di DB (anti double-claim).
- ✅ Pengaman polling: bila webhook belum/gagal terkirim, server cek status langsung ke API Midtrans (maks 1×/4 detik per transaksi) — tetap validasi server-ke-server, bukan klaim pembeli.
- ✅ QRIS kedaluwarsa: server menandai **"Pembayaran Expired"** dan buyer bisa buat QR baru.
- ✅ Semua kredensial hanya via environment variable di server; route simulasi demo otomatis 404 saat key terpasang.
- ✅ Channel fallback otomatis: bila `payment_type=qris` ditolak 402, otomatis coba `payment_type=gopay` (menghasilkan QRIS yang sama).

## Arsitektur singkat

```
Buyer checkout (QRIS)
  → POST /api/orders (status PENDING)
  → POST /api/payment/create → Midtrans /v2/charge (QRIS GoPay) → simpan tabel payments
  → Buyer scan QR (berlaku 15 menit, polling tiap 3 detik)
  → Buyer bayar → Midtrans kirim webhook → POST /api/payment/webhook
      → verifikasi signature + nominal → payments.status = PAID
  → UI otomatis berubah: "Pembayaran Berhasil" ✅
```

Tabel DB: `payments` (orderId, gateway, reference, amount, status, qrString, qrImageUrl,
payUrl, paidAt, expiresAt, rawPayload) — semua transaksi & status tersimpan.

## Lampiran: Sandbox (tidak lagi dipakai, hanya referensi)

Mode sandbox TIDAK lagi dipakai aplikasi. Bila suatu saat perlu uji ulang tanpa uang
asli: isi `MIDTRANS_SERVER_KEY` dengan key sandbox + `MIDTRANS_IS_PRODUCTION=false`
→ Redeploy. Catatan: channel sandbox baru juga harus diaktifkan & sering butuh
aktivasi manual via support@midtrans.com (kasus terdokumentasi di issue
midtrans-nodejs-client #93) — justru karena itu aplikasi langsung dialihkan ke produksi.

## Troubleshooting

| Masalah | Penyebab & solusi |
|---|---|
| Error "Payment channel is not activated" (402) | Channel QRIS/GoPay belum aktif di akun **produksi** → ikuti langkah aktivasi di bagian **STATUS SAAT INI** (verifikasi data merchant + aktivasi channel + email support bila perlu) |
| "Merchant pop id is not found" (404, channel gopay) | Akun produksi belum terdaftar GoPay/POP → masuk dalam permintaan aktivasi channel yang sama ke support@midtrans.com |
| "Server Key tidak dikenali gateway (401)" | Key tertukar antar lingkungan / salah salin. Pastikan `MIDTRANS_SERVER_KEY` = key produksi dan `MIDTRANS_IS_PRODUCTION=true`. Setelah ubah env Vercel → Redeploy |
| QR tampil tapi bayar tidak terdeteksi | URL webhook belum didaftarkan di dashboard **produksi**, atau salah domain — cek langkah 4 (fallback polling akan tetap mendeteksi maks. beberapa detik lebih lambat) |
| Webhook di dashboard gagal (403) | Signature tidak cocok — pastikan Server Key di Vercel sama dengan akun gateway produksi |
| "Gagal membuat QRIS" | Lihat `detail` pada respons error (tampil di layar QRIS) — umumnya kredensial/channel belum siap |
| Masih muncul tombol "Simulasi" | `MIDTRANS_SERVER_KEY` belum terisi di deployment tersebut — set env lalu Redeploy |
| Uji pembayaran produksi takut kepotong uang | Buat tagihan kecil (Rp1.000) untuk uji pertama; transaksi PENDING yang tidak dibayar tidak memindahkan uang dan otomatis expired |
