# 💳 Panduan Pembayaran QRIS Manual — Jajan Riyen

Metode pembayaran QRIS berjalan **manual tanpa gateway** (tidak pakai Midtrans):
pembeli scan **QRIS statis milik penjual**, bayar sesuai total, lalu mengirim
**kode referensi transaksi** sebagai bukti bayar. **Penjual mengecek manual**
(mutasi/e-wallet) lalu mengonfirmasi atau menolak bukti tersebut.

## Alur lengkap

```
PEMBELI                                   PENJUAL
────────                                  ───────
1. Checkout / keranjang → pilih QRIS
   (tersedia bila penjual mengaktifkan)
2. Layar "Bayar via QRIS":
   scan QRIS penjual → bayar PERSIS
   total pesanan di e-wallet/m-banking
3. Salin kode referensi / ID transaksi
   dari bukti transaksi → kirim
   ("Kirim Bukti Pembayaran")
4. Status: MENUNGGU VERIFIKASI
   (layar polling otomatis tiap 3 dtk)  →  5. Dashboard Penjual → Pesanan:
                                              kartu kuning berisi kode referensi
                                              pembeli → cek mutasi/e-wallet sendiri
6. Status berubah otomatis:              →  6a. "✅ Terima Bayar" → Pembayaran
   "Pembayaran Berhasil" ✅                      Berhasil (PAID)
   atau                                          6b. "✖ Tolak Bukti" → Pembayaran
   "Pembayaran Gagal" (bila ditolak)             Gagal — pembeli bisa kirim kode baru
                                         →  7. "✅ Terima Pesanan" (terbuka HANYA
                                              setelah pembayaran terverifikasi)
```

## Pengaman yang aktif

- ✅ **Gate status pesanan**: pesanan QRIS **tidak bisa diterima penjual** (PENDING →
  Diproses) sebelum bukti bayar diverifikasi — dicek di server (`PATCH /api/orders/[id]`
  menolak dengan 409) dan tombolnya dikunci di UI.
- ✅ **Kepemilikan toko**: verifikasi bukti hanya bisa dilakukan penjual pemilik pesanan
  (cek `storeId`, selain itu 403).
- ✅ **Anti dobel-kirim**: bukti PENDING yang sama dipakai ulang (idempoten), satu pesanan
  tidak bisa terbayar ganda.
- ✅ **Anti regresi**: payment yang sudah PAID tidak bisa diubah lagi oleh aksi apa pun.
- ✅ Kode referensi wajib 4–64 karakter (divalidasi server).
- ✅ Riwayat bukti tersimpan di tabel `payments` (kode, status, waktu verifikasi,
  penjual verifikator) untuk audit.

## Setup penjual (sekali)

1. **Dashboard Penjual** → tab **Toko**.
2. Aktifkan **QRIS** → unggah **gambar QRIS statis** (foto/scan QRIS milikmu — QR cetak
   dari bank/e-wallet atau QRIS resmi merchant) + isi **Kode QRIS / NMID** bila ada.
3. Simpan. Sekarang pembeli bisa memilih QRIS di toko kamu.

> ⚠️ QR yang diunggah harus QRIS ASLI milik penjual. Bila kosong, aplikasi hanya
> menampilkan QR contoh dengan peringatan yang jelas (tidak bisa dipakai bayar).

## Untuk pembeli — di mana kode referensinya?

| Aplikasi | Lokasi kode |
|---|---|
| GoPay | Riwayat → detail transaksi → **ID Transaksi / Ref ID** |
| DANA | Riwayat transaksi → **No. Referensi** |
| OVO | Riwayat → detail → **ID Transaksi** |
| ShopeePay | Riwayat → **ID Transaksi / Receipt** |
| m-banking (BCA/BRI/dll.) | Mutasi/rek koran → **Berita / Ref / No. Transaksi** |

Salin kode itu (biasanya kombinasi angka/huruf 8–16 karakter) ke kolom
"Kode Referensi Transaksi" di layar bayar.

## Arsitektur singkat

```
POST /api/orders                      → pesanan PENDING (paymentMethod QRIS)
POST /api/payment/create              → pembeli kirim {orderId, referenceCode}
                                        → Payment (gateway "manual", status PENDING)
GET  /api/payment/[id]                → polling status (dipakai layar bayar, 3 dtk)
PATCH /api/payment/[id]               → penjual {action: "verify"|"reject", storeId}
                                        verify → PAID (paidAt+verifiedAt+verifiedBy)
                                        reject → FAILED (+rejectNote opsional)
PATCH /api/orders/[id]                → PENDING→PROCESSING dibatasi: payment harus PAID
```

Tabel DB `payments`: orderId, gateway ("manual"), reference (kode pembeli), amount,
status, verifiedAt, verifiedBy, rejectNote, paidAt, createdAt, dst.
Kolom lama gateway (`qrString`, `qrImageUrl`, `payUrl`, `expiresAt`, `rawPayload`)
tetap ada hanya untuk data historis.

## Troubleshooting

| Masalah | Penyebab & solusi |
|---|---|
| Opsi QRIS tidak muncul di checkout | Penjual belum mengaktifkan QRIS / belum unggah gambar QR — lengkapi di Dashboard Penjual → Toko |
| Pembeli salah kirim kode | Penjual tekan **✖ Tolak Bukti** → pembeli kirim ulang kode yang benar |
| Tombol "Terima Pesanan" terkunci | Pembayaran belum diverifikasi — cek kode referensi dulu, lalu "✅ Terima Bayar" |
| Pembeli sudah bayar tapi kode ditolak penjual | Cek kembali mutasi; kode bisa beda format — tanyakan bukti transfer/screenshot ke pembeli |
| Status tidak berubah di layar pembeli | Layar polling tiap 3 detik; tutup-buka layar juga menyegarkan. Badge status juga tampil di daftar Pesanan |
| Sudah terlanjur terima pesanan tanpa cek | Uang tidak otomatis terkonfirmasi sistem — cocokkan manual lewat mutasi; komunikasi langsung dengan pembeli bila bermasalah |

> 📌 Catatan: integrasi gateway Midtrans sudah **dihapus total** dari kode
> (lib, route webhook/simulasi/config). Bila suatu saat ingin gateway otomatis
> lagi, lihat riwayat git (branch/tag sebelum commit "QRIS manual").
