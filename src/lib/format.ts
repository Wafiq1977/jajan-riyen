export function formatRupiah(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

/** Compact rupiah for tight stat chips: Rp1,2jt / Rp54rb */
export function formatRupiahCompact(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `Rp${v.toFixed(v < 10 ? 1 : 0).replace(".", ",").replace(",0", "")}jt`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return `Rp${v.toFixed(v < 10 ? 1 : 0).replace(".", ",").replace(",0", "")}rb`;
  }
  return formatRupiah(n);
}

export function maskPhone(phone: string): string {
  if (phone.length < 7) return phone;
  return phone.slice(0, 4) + "****" + phone.slice(-3);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function discountPercent(price: number, original?: number | null): number | null {
  if (!original || original <= price) return null;
  return Math.round(((original - price) / original) * 100);
}

export function statusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Menunggu Konfirmasi";
    case "PROCESSING":
      return "Diproses";
    case "COMPLETED":
      return "Selesai";
    case "CANCELLED":
      return "Dibatalkan";
    default:
      return status;
  }
}

/** Label status pembayaran QRIS sesuai kebutuhan aplikasi */
export function paymentStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Menunggu Pembayaran";
    case "PAID":
      return "Pembayaran Berhasil";
    case "EXPIRED":
      return "Pembayaran Expired";
    case "FAILED":
      return "Pembayaran Gagal";
    default:
      return status;
  }
}

/** Sisa detik menuju kedaluwarsa (ISO string) — min 0 */
export function secondsLeft(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
}
