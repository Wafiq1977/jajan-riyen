import { createHash, randomInt } from "crypto";

/**
 * OTP engine Jajan Riyen.
 *
 * Kode OTP dibuat di server, disimpan sebagai HASH (SHA-256 + salt) dengan
 * masa berlaku, lalu DIKIRIM BENERAN via WhatsApp / SMS memakai gateway
 * pilihan pengguna (cukup salah satu):
 *
 *   1. FONNTE_TOKEN       → WhatsApp via Fonnte (https://fonnte.com) — gratis, populer di Indonesia
 *   2. WABLAS_TOKEN       → WhatsApp via Wablas (https://wablas.com) (+ opsional WABLAS_DOMAIN)
 *   3. TWILIO_ACCOUNT_SID → SMS via Twilio (https://www.twilio.com) + TWILIO_AUTH_TOKEN + TWILIO_FROM
 *
 * Jika TIDAK ada provider yang dikonfigurasi (mis. saat development),
 * request tetap sukses tapi respons berisi `devMode: true` + `devCode`
 * agar alur bisa dites tanpa gateway. Begitu token diisi, kode hanya
 * dikirim ke WhatsApp/SMS pemilik nomor — tidak pernah tampil di aplikasi.
 */

export const OTP_TTL_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_PER_HOUR = 5;

export function generateOtp(): string {
  return String(randomInt(100000, 1000000));
}

export function hashOtp(code: string, phone: string): string {
  const salt = process.env.OTP_SALT ?? "jajanriyen-otp-salt";
  return createHash("sha256").update(`${salt}:${phone}:${code}`).digest("hex");
}

/** 081234567890 / 81234567890 → 6281234567890 (format internasional) */
export function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = `62${p.slice(1)}`;
  return p;
}

export interface OtpSendResult {
  sent: boolean;
  via: "whatsapp" | "sms" | null;
  provider: string | null;
  error?: string;
}

function buildMessage(code: string): string {
  return (
    `*Jajan Riyen*\n\n` +
    `Kode verifikasi kamu: *${code}*\n\n` +
    `Berlaku ${OTP_TTL_MINUTES} menit. Jangan bagikan kode ini ke siapa pun, ` +
    `termasuk pihak yang mengaku petugas Jajan Riyen. 🙏`
  );
}

async function sendFonnte(phone: string, message: string): Promise<void> {
  const res = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: process.env.FONNTE_TOKEN!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ target: phone, message, countryCode: "62" }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Fonnte ${res.status}: ${text.slice(0, 180)}`);
  }
  const data = (await res.json().catch(() => ({}))) as { status?: boolean | string; reason?: string };
  if (data.status === false || data.status === "false") {
    throw new Error(`Fonnte: ${data.reason ?? "gagal mengirim"}`);
  }
}

async function sendWablas(phone: string, message: string): Promise<void> {
  const domain = process.env.WABLAS_DOMAIN || "https://console.wablas.com";
  const res = await fetch(`${domain.replace(/\/$/, "")}/api/send-message`, {
    method: "POST",
    headers: {
      Authorization: process.env.WABLAS_TOKEN!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ target: phone, message }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Wablas ${res.status}: ${text.slice(0, 180)}`);
  }
  const data = (await res.json().catch(() => ({}))) as { status?: boolean | string; message?: string };
  if (data.status === false || data.status === "false") {
    throw new Error(`Wablas: ${data.message ?? "gagal mengirim"}`);
  }
}

async function sendTwilio(phone: string, message: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM!;
  const body = new URLSearchParams({ To: `+${phone}`, From: from, Body: message });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Twilio ${res.status}: ${text.slice(0, 180)}`);
  }
}

/** Kirim OTP ke nomor HP pengguna lewat provider pertama yang aktif. */
export async function sendOtp(phone62: string, code: string): Promise<OtpSendResult> {
  const message = buildMessage(code);

  try {
    if (process.env.FONNTE_TOKEN) {
      await sendFonnte(phone62, message);
      return { sent: true, via: "whatsapp", provider: "fonnte" };
    }
    if (process.env.WABLAS_TOKEN) {
      await sendWablas(phone62, message);
      return { sent: true, via: "whatsapp", provider: "wablas" };
    }
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) {
      await sendTwilio(phone62, message);
      return { sent: true, via: "sms", provider: "twilio" };
    }
  } catch (e) {
    return {
      sent: false,
      via: null,
      provider: process.env.FONNTE_TOKEN ? "fonnte" : process.env.WABLAS_TOKEN ? "wablas" : "twilio",
      error: e instanceof Error ? e.message : "Gagal mengirim pesan",
    };
  }

  // Tidak ada provider dikonfigurasi → mode pengembangan
  return { sent: false, via: null, provider: null };
}

export function activeProvider(): { provider: string; via: "whatsapp" | "sms" } | null {
  if (process.env.FONNTE_TOKEN) return { provider: "fonnte", via: "whatsapp" };
  if (process.env.WABLAS_TOKEN) return { provider: "wablas", via: "whatsapp" };
  if (process.env.TWILIO_ACCOUNT_SID) return { provider: "twilio", via: "sms" };
  return null;
}
