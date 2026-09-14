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

export const SERVER_KEY = (process.env.MIDTRANS_SERVER_KEY || "").trim();

/**
 * Deteksi lingkungan gateway:
 * 1. MIDTRANS_IS_PRODUCTION="true"/"false" → override EKSPLISIT (paling andal).
 *    WAJIB untuk key sandbox akun Midtrans BARU yang TIDAK berprefix "SB-"
 *    (formatnya "Mid-server-…" — identik dengan key produksi, tidak bisa dibedakan).
 * 2. Tanpa env → heuristik prefix klasik: "SB-" = sandbox; selain itu = produksi.
 */
function resolveIsProduction(): boolean {
  const envFlag = (process.env.MIDTRANS_IS_PRODUCTION || "").trim().toLowerCase();
  if (envFlag === "true") return true;
  if (envFlag === "false") return false;
  return !!SERVER_KEY && !SERVER_KEY.startsWith("SB-");
}
export const IS_PRODUCTION = resolveIsProduction();

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

/** Respons charge Midtrans (subset field yang dipakai) */
interface ChargeData {
  status_code?: string;
  status_message?: string;
  qr_string?: string;
  redirect_url?: string;
  expiry_time?: string;
  actions?: { name?: string; url?: string }[];
  validation_messages?: string[];
}

/** Panggil Core API /v2/charge dan parse responsnya */
async function midtransCharge(body: Record<string, unknown>): Promise<{
  ok: boolean;
  httpStatus: number;
  data: ChargeData;
}> {
  const res = await fetch(`${API_BASE}/v2/charge`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as ChargeData;
  const ok = res.ok && (!data.status_code || ["201", "200"].includes(data.status_code));
  return { ok, httpStatus: res.status, data };
}

function chargeErrorMessage(data: ChargeData, httpStatus: number): string {
  return `Midtrans: ${
    data.status_message || data.validation_messages?.join(", ") || `HTTP ${httpStatus}`
  }`;
}

/** Susun hasil charge sukses (QR data-URL, expiry, dsb.) */
async function buildChargeResult(
  reference: string,
  data: ChargeData
): Promise<QrisChargeResult> {
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
    reference,
    qrString: data.qr_string ?? null,
    qrImageUrl,
    payUrl: data.redirect_url ?? null,
    expiresAt,
  };
}

/**
 * Buat transaksi QRIS di Midtrans (Core API /v2/charge).
 * amount dalam rupiah (integer). Melempar Error bila gateway menolak.
 *
 * Resiliensi: channel "QRIS" dan "GoPay" di dashboard Midtrans sering menjadi
 * toggle terpisah — bila salah satu belum aktif, otomatis dicoba pasangannya
 * (payment_type gopay juga menghasilkan QRIS QR yang sama + qr_string).
 */
export async function createMidtransQris(opts: {
  reference: string;
  amount: number;
  customerName?: string;
  itemName?: string;
}): Promise<QrisChargeResult> {
  const common = {
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

  const attemptQris = await midtransCharge({
    payment_type: "qris",
    qris: { acquirer: "gopay" },
    ...common,
  });

  if (attemptQris.ok) return buildChargeResult(opts.reference, attemptQris.data);

  // Bila channel QRIS nonaktif, coba channel GoPay (hasil QR sama)
  if (/not activated/i.test(attemptQris.data.status_message || "")) {
    const attemptGopay = await midtransCharge({
      payment_type: "gopay",
      gopay: { enable_callback: false },
      ...common,
    });
    if (attemptGopay.ok) return buildChargeResult(opts.reference, attemptGopay.data);
    if (/not activated/i.test(attemptGopay.data.status_message || "")) {
      // Keduanya nonaktif — pesan tunggal yang jelas (tetap cocok regex "not activated")
      throw new Error("Midtrans: Payment channel is not activated (QRIS & GoPay).");
    }
    throw new Error(chargeErrorMessage(attemptGopay.data, attemptGopay.httpStatus));
  }

  throw new Error(chargeErrorMessage(attemptQris.data, attemptQris.httpStatus));
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

/**
 * Cek status transaksi langsung ke API Midtrans (server-to-server).
 * Dipakai route polling sebagai PENGAMAN bila webhook belum/gagal terkirim —
 * hasil tetap berbasis gateway, bukan klaim pembeli.
 */
export async function fetchMidtransStatus(
  reference: string
): Promise<{ transactionStatus: string; fraudStatus?: string; grossAmount?: string } | null> {
  if (!SERVER_KEY) return null;
  try {
    const res = await fetch(`${API_BASE}/v2/${encodeURIComponent(reference)}/status`, {
      headers: { Accept: "application/json", Authorization: authHeader() },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      transaction_status?: string;
      fraud_status?: string;
      gross_amount?: string;
    };
    if (!data.transaction_status) return null;
    return {
      transactionStatus: data.transaction_status,
      fraudStatus: data.fraud_status,
      grossAmount: data.gross_amount,
    };
  } catch {
    return null;
  }
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
