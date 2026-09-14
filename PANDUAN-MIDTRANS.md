# 💳 Panduan QRIS Otomatis — Jajan Riyen (Midtrans)

Pembayaran QRIS dinamis sudah **terpasang lengkap** di aplikasi: buyer checkout → QRIS
sesuai total tampil → buyer scan & bayar → **payment gateway mengirim webhook** → status
pesanan berubah otomatis menjadi **"Pembayaran Berhasil"**.

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
Dashboard → **Settings → Access Keys** → salin **Server Key**
(sandbox diawali `SB-Midtrans-server-...`).

### 3. Pasang di Vercel
Project `jajan-riyen` → **Settings → Environment Variables** → tambahkan:

| Name | Value |
|---|---|
| `MIDTRANS_SERVER_KEY` | (Server Key dari langkah 2) |
| `MIDTRANS_IS_PRODUCTION` | `true` (hanya jika pakai kunci produksi; sandbox dikosongkan) |
| `PAYMENT_EXPIRY_MINUTES` | `15` (opsional) |

→ **Redeploy** (Deployments → terbaru → Redeploy).

### 4. Daftarkan URL Webhook (WAJIB)
Dashboard Midtrans → **Settings → Configuration → Payment Notification URL**:

```
https://jajan-riyen.vercel.app/api/payment/webhook
```

(boleh diisi juga di kolom "Finish Redirect URL" bila ingin redirect ke app.)

### 5. Uji di Sandbox
1. Buat pesanan QRIS di aplikasi → QR tampil.
2. Dashboard Midtrans sandbox → **Transactions** → klik transaksi `JR-XXXXXX-xxxx` →
   **Simulate payment → Success**.
3. Dalam beberapa detik aplikasi berubah → **"Pembayaran Berhasil"** (webhook masuk).

## Keamanan yang sudah diterapkan

- ✅ Signature webhook diverifikasi `sha512(order_id + status_code + gross_amount + serverKey)` — payload palsu ditolak **403**.
- ✅ Nominal webhook dicocokkan dengan tagihan — notifikasi nominal beda diabaikan.
- ✅ Anti-regresi status: `PAID` tidak bisa diturunkan oleh notifikasi lain; `EXPIRED` yang ternyata terbayar tetap dinaikkan ke `PAID` (gateway = sumber kebenaran).
- ✅ Idempoten: settlement berulang aman; satu order tidak bisa ter-charge ganda.
- ✅ QRIS kedaluwarsa: server menandai **"Pembayaran Expired"** dan buyer bisa buat QR baru.
- ✅ Semua kredensial hanya via environment variable di server.

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
| QR tampil tapi bayar tidak terdeteksi | URL webhook belum didaftarkan di Midtrans, atau salah domain — cek langkah 4 |
| Webhook di dashboard gagal (403) | Signature tidak cocok — pastikan Server Key di Vercel sama dengan akun gateway |
| "Gagal membuat QRIS" | Server Key salah/produksi tanpa verifikasi; lihat `detail` pada respons error |
| Masih muncul tombol "Simulasi" | `MIDTRANS_SERVER_KEY` belum terisi di deployment tersebut — set env lalu Redeploy |
