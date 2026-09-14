import { NextResponse } from "next/server";
import { EXPIRY_MINUTES, IS_PRODUCTION, gatewayActive } from "@/lib/payment";

/**
 * GET /api/payment/config — info mode pembayaran untuk frontend (TANPA kredensial).
 * gateway: "midtrans" = QRIS otomatis asli via gateway; "demo" = mode uji tanpa kredensial.
 * environment: "production" | "sandbox" — membantu penjual memastikan key yang terpasang
 * dipakai di lingkungan yang benar (tidak ada materi kredensial yang dikirim).
 */
export async function GET() {
  return NextResponse.json({
    gateway: gatewayActive ? "midtrans" : "demo",
    environment: gatewayActive ? (IS_PRODUCTION ? "production" : "sandbox") : null,
    active: true,
    expiryMinutes: EXPIRY_MINUTES,
  });
}
