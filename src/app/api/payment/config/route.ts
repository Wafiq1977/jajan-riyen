import { NextResponse } from "next/server";
import { EXPIRY_MINUTES, gatewayActive } from "@/lib/payment";

/**
 * GET /api/payment/config — info mode pembayaran untuk frontend (TANPA kredensial).
 * gateway: "midtrans" = QRIS otomatis asli via gateway; "demo" = mode uji tanpa kredensial.
 */
export async function GET() {
  return NextResponse.json({
    gateway: gatewayActive ? "midtrans" : "demo",
    active: true,
    expiryMinutes: EXPIRY_MINUTES,
  });
}
