import { createHash, randomBytes, timingSafeEqual } from "crypto";
import QRCode from "qrcode";

/**
 * Lib pembayaran QRIS Jajan Riyen.
 *
 * DUA MODE OTOMATIS (zero-config):
 * 1. MIDTRANS (aktif bila MIDTRANS_SERVER_KEY terisi) — Core API QRIS (GoPay acquirer).
 *    Pembayaran divalidasi HANYA lewat webhook Midtrans (/api/payment/webhook)
 *    dengan verifikasi signature sha512(order_id+status_code+gross_amount+serverKey).
 * 2. DEMO (tanpa kredensial) — QR dibuat lokal untuk keperluan uji/demo UI.
 *    Pembayaran "disimulasikan" via /api/payment/demo-simulate yang memakai jalur
 *    logika webhook yang sama. Route demo otomatis NONAKTIF (404) saat kredensial asli terpasang.
 *
 * SEMUA kredensial hanya dibaca di server (API routes) — tidak pernah terkirim ke frontend.
 */

export const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "";
export const IS_PRODUCTION =
  process.env.MIDTRANS_IS_PRODUCTION === "true" ||
  (!!SERVER_KEY && !SERVER_KEY.startsWith("SB-Midtrans-server-"));

/** Menit berlaku QRIS sebelum expired */
export const EXPIRY_MINUTES = Math.max(
  1,
  Math.min(120, Number(process.env.PAYMENT_EXPIRY_MINUTES) || 15)
);

/** Gateway aktif = kredensial Midtrans terpasang */
export const gatewayActive = Boolean(SERVER_KEY);

const API_BASE = IS_PRODUCTION
  ? "https://api.midtrans.com"
  : "https://api.sandbox.midtrans.com";

function authHeader(): string {
  return `Basic ${Buffer.from(`${SERVER_KEY}:`).toString("base64")}`;
}

export interface QrisChargeResult {
  reference: string; // order_id unik di gateway
  qrString: string | null;
  qrImageUrl: string | null;
  payUrl: string | null;
  expiresAt: Date;
}

/**
 * Buat transaksi QRIS di Midtrans (Core API /v2/charge).
 * amount dalam rupiah (integer). Melempar Error bila gateway menolak.
 */
export async function createMidtransQris(opts: {
  reference: string;
  amount: number;
  customerName?: string;
  itemName?: string;
}): Promise<QrisChargeResult> {
  const body = {
    payment_type: "qris",
    qris: { acquirer: "gopay" },
    transaction_details: {
      order_id: opts.reference,
      gross_amount: opts.amount,
    },
    custom_expiry: { expiry_duration: EXPIRY_MINUTES, unit: "minute" },
    customer_details: { first_name: opts.customerName || "Pembeli JajanRiyen" },
    item_details: opts.itemName
      ? [
          {
            id: "item",
            price: opts.amount,
            quantity: 1,
            name: opts.itemName.slice(0, 50),
          },
        ]
      : undefined,
  };

  const res = await fetch(`${API_BASE}/v2/charge`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as {
    status_code?: string;
    status_message?: string;
    qr_string?: string;
    redirect_url?: string;
    expiry_time?: string;
    actions?: { name?: string; url?: string }[];
    validation_messages?: string[];
  };

  if (!res.ok || (data.status_code && !["201", "200"].includes(data.status_code))) {
    throw new Error(
      `Midtrans: ${data.status_message || data.validation_messages?.join(", ") || `HTTP ${res.status}`}`
    );
  }

  const qrAction = data.actions?.find((a) => a.name === "generate-qr-code")?.url ?? null;

  // expiresAt: pakai waktu dari gateway bila ada, kalau tidak hitung sendiri
  const expiresAt = data.expiry_time
    ? new Date(data.expiry_time)
    : new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

  let qrImageUrl: string | null = qrAction;
  if (data.qr_string) {
    try {
      qrImageUrl = await QRCode.toDataURL(data.qr_string, { width: 512, margin: 1 });
    } catch {
      qrImageUrl = qrAction;
    }
  }

  return {
    reference: opts.reference,
    qrString: data.qr_string ?? null,
    qrImageUrl,
    payUrl: data.redirect_url ?? null,
    expiresAt,
  };
}

/** Buat QR mode demo (lokal, tanpa gateway) */
export async function createDemoQris(reference: string, amount: number): Promise<QrisChargeResult> {
  const qrString = `JRIS|DEMO|${reference}|${amount}`;
  const qrImageUrl = await QRCode.toDataURL(qrString, { width: 512, margin: 1 });
  return {
    reference,
    qrString,
    qrImageUrl,
    payUrl: null,
    expiresAt: new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000),
  };
}

/** Verifikasi signature webhook Midtrans: sha512(order_id + status_code + gross_amount + serverKey) */
export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string | undefined
): boolean {
  if (!SERVER_KEY || !signatureKey) return false;
  const expected = createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${SERVER_KEY}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureKey);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Reference unik per attempt: JR-XXXXXXXX-xxxx */
export function makeReference(orderCode: string): string {
  return `${orderCode}-${randomBytes(2).toString("hex")}`;
}

/** Mapping transaction_status Midtrans (+fraud_status) → status internal */
export function mapMidtransStatus(
  transactionStatus: string,
  fraudStatus?: string
): "PENDING" | "PAID" | "EXPIRED" | "FAILED" | null {
  switch (transactionStatus) {
    case "settlement":
      return "PAID";
    case "capture":
      if (fraudStatus === "accept") return "PAID";
      if (fraudStatus === "challenge") return "PENDING";
      return "FAILED";
    case "pending":
      return "PENDING";
    case "expire":
      return "EXPIRED";
    case "cancel":
    case "deny":
      return "FAILED";
    default:
      return null;
  }
}
