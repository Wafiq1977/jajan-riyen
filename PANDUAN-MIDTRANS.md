# 💳 Panduan QRIS Otomatis — Jajan Riyen (Midtrans)

Pembayaran QRIS dinamis sudah **terpasang lengkap** di aplikasi: buyer checkout → QRIS
sesuai total tampil → buyer scan & bayar → **payment gateway mengirim webhook** → status
pesanan berubah otomatis menjadi **"Pembayaran Berhasil"**.

## ⚡ STATUS SAAT INI (wajib dibaca)

**Key SANDBOX sudah terverifikasi valid** (auth `api.sandbox.midtrans.com` sukses) dan
aplikasi sudah diarahkan ke sandbox — tetapi charge QRIS masih ditolak Midtrans:

> `Midtrans: Payment channel is not activated.`

Artinya channel pembayaran QRIS/GoPay **belum diaktifkan di akun SANDBOX ini**.
Akun sandbox Midtrans baru memang mulai kosong — channel harus dinyalakan manual.
Sampai itu selesai:
- Pembeli yang memilih QRIS melihat pesan jelas: *"Channel pembayaran QRIS/GoPay belum
  diaktifkan di akun Midtrans SANDBOX. Buka https://dashboard.sandbox.midtrans.com →
  Settings → Payment Methods → aktifkan QRIS/GoPay..."* + tombol coba lagi.
- Metode **TUNAI tetap berfungsi normal**, dan QRIS statis toko tetap tersedia.

**⚠️ PENTING — key sandbox akun Midtrans BARU tidak berprefix `SB-`:**
Server key sandbox dari dashboard baru berformat `Mid-server-…` (persis key produksi),
sehingga tidak bisa dibedakan otomatis dari key produksi. Solusinya: variabel
`MIDTRANS_IS_PRODUCTION=false` **wajib** diset agar request diarahkan ke sandbox.
Sudah dipasang di `.env` sandbox & wajib juga di Vercel (langkah 3 di bawah).

**Cara mengaktifkan QRIS di akun SANDBOX (dikerjakan user):**
1. Buka https://dashboard.sandbox.midtrans.com
2. **Settings → Payment Methods** → cari **QRIS / GoPay** → klik **Aktifkan**.
3. **Settings → Configuration → Payment Notification URL** → isi
   `https://jajan-riyen.vercel.app/api/payment/webhook` (di dashboard **sandbox**).
4. Set env di Vercel (langkah 3 di bawah) → Redeploy.
5. Uji: buat pesanan QRIS di aplikasi → QR tampil → bayar via simulator sandbox
   (langkah 5 di bawah).

> Key produksi (`Mid-server-dw70Jx…`) tetap VALID dan sudah tersimpan — dipakai saat
> mau go-live: aktifkan channel QRIS/GoPay di https://dashboard.midtrans.com, lalu di
> Vercel ganti key ke produksi + set `MIDTRANS_IS_PRODUCTION=true` (atau hapus env itu)
> → Redeploy.

## Dua mode (otomatis, tanpa ubah kode)

| Mode | Kapan aktif | Cara bayar | Validasi |
|---|---|---|---|
| **DEMO** | Tidak ada `MIDTRANS_SERVER_KEY` di server | QR ditampilkan + tombol "Simulasi: Pembayaran Berhasil" | Jalur logika webhook yang sama (lokal) |
| **MIDTRANS (asli)** | `MIDTRANS_SERVER_KEY` terisi | Scan QRIS oleh semua e-wallet/m-banking | **Webhook Midtrans + signature sha512** |

> Saat mode asli aktif, tombol simulasi demo **otomatis mati (404)** — produksi hanya
> menerima validasi dari webhook gateway. Kredensial 100% di server, frontend hanya
> menerima gambar QR & status.

## Langkah aktifkan QRIS asli (gratis daftar)

### 1. Daftar Midtrans
- Sandbox (uji coba, gratis): https://dashboard.sandbox.midtrans.com
- Produksi (uang beneran; perlu verifikasi identitas/usaha): https://dashboard.midtrans.com

### 2. Ambil Server Key
Dashboard → **Settings → Access Keys** → salin **Server Key**.
(produksi `Mid-server-...`; sandbox klasik `SB-Mid-server-...`; sandbox akun baru
`Mid-server-...` — tanpa prefix SB-!).

> ✅ Sudah dilakukan: Server Key SANDBOX (format baru `Mid-server-gHkC…`) terverifikasi
> valid & aktif di sandbox dengan `MIDTRANS_IS_PRODUCTION=false`. Key produksi yang lama
> juga valid (tersimpan utk go-live nanti).

### 3. Pasang di Vercel
Project `jajan-riyen` → **Settings → Environment Variables** → tambahkan:

| Name | Value |
|---|---|
| `MIDTRANS_SERVER_KEY` | Server Key sandbox: `Mid-server-gHkC…JsXNT` (sama seperti `.env`) |
| `MIDTRANS_IS_PRODUCTION` | `false` — **WAJIB** utk key sandbox tanpa prefix `SB-` |
| `PAYMENT_EXPIRY_MINUTES` | `15` (opsional) |

→ **Redeploy** (Deployments → terbaru → Redeploy).

### 4. Daftarkan URL Webhook (WAJIB)
Dashboard Midtrans → **Settings → Configuration → Payment Notification URL**:

```
https://jajan-riyen.vercel.app/api/payment/webhook
```

(boleh diisi juga di kolom "Finish Redirect URL" bila ingin redirect ke app.)

### 5. Uji di Sandbox
1. Buat pesanan QRIS di aplikasi → QR tampil (ada badge **SANDBOX** di header layar QRIS).
2. Bayar lewat simulator: Dashboard sandbox → **Transactions** → klik transaksi
   `JR-XXXXXX-xxxx` → ikuti opsi **simulate payment** (QRIS sandbox tidak bisa discan
   e-wallet sungguhan — memang hanya untuk uji).
3. Dalam beberapa detik aplikasi berubah → **"Pembayaran Berhasil"** — webhook masuk;
   bila webhook belum terdaftar, fallback polling server tetap mendeteksi (±3 detik).

## Keamanan yang sudah diterapkan

- ✅ Signature webhook diverifikasi `sha512(order_id + status_code + gross_amount + serverKey)` — payload palsu ditolak **403** (diuji dengan key asli).
- ✅ Nominal webhook dicocokkan dengan tagihan — notifikasi nominal beda diabaikan (diuji).
- ✅ Anti-regresi status: `PAID` tidak bisa diturunkan oleh notifikasi lain; `EXPIRED` yang ternyata terbayar tetap dinaikkan ke `PAID` (gateway = sumber kebenaran).
- ✅ Idempoten: settlement berulang aman (diuji); satu order tidak bisa ter-charge ganda; `reference` transaksi **unique** di DB (anti double-claim).
- ✅ Pengaman polling: bila webhook belum/gagal terkirim, server cek status langsung ke API Midtrans (maks 1×/4 detik per transaksi) — tetap validasi server-ke-server, bukan klaim pembeli.
- ✅ QRIS kedaluwarsa: server menandai **"Pembayaran Expired"** dan buyer bisa buat QR baru.
- ✅ Semua kredensial hanya via environment variable di server; route simulasi demo otomatis 404 saat key terpasang.

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

## Troubleshooting

| Masalah | Penyebab & solusi |
|---|---|
| Error "Payment channel is not activated" | Channel QRIS/GoPay belum diaktifkan di dashboard (sandbox ATAU produksi) → lihat bagian **STATUS SAAT INI** di atas |
| "Server Key tidak dikenali gateway (401)" | Key tertukar antar lingkungan / salah salin. Key sandbox akun baru format `Mid-server-…` **wajib** disertai `MIDTRANS_IS_PRODUCTION=false`; key produksi cukup sendiri. Setelah ubah env Vercel → Redeploy |
| QR tampil tapi bayar tidak terdeteksi | URL webhook belum didaftarkan di Midtrans, atau salah domain — cek langkah 4 (fallback polling akan tetap mendeteksi maks. beberapa detik lebih lambat) |
| Webhook di dashboard gagal (403) | Signature tidak cocok — pastikan Server Key di Vercel sama dengan akun gateway |
| "Gagal membuat QRIS" | Lihat `detail` pada respons error (tampil di layar QRIS) — umumnya kredensial/channel belum siap |
| Masih muncul tombol "Simulasi" | `MIDTRANS_SERVER_KEY` belum terisi di deployment tersebut — set env lalu Redeploy |
