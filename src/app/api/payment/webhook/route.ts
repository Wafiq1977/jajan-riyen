import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapMidtransStatus, verifyMidtransSignature } from "@/lib/payment";

export const runtime = "nodejs";

/**
 * POST /api/payment/webhook — HTTP Notification dari Midtrans.
 *
 * ATURAN VALIDASI (sesuai kebutuhan aplikasi):
 * - Status "PAID"/"EXPIRED"/"FAILED" HANYA ditetapkan lewat webhook ini.
 * - Signature wajib: sha512(order_id + status_code + gross_amount + serverKey).
 *   Payload tanpa/tanda tangan salah ditolak 403.
 * - Idempoten: settlement berulang tidak menimpa apa pun; settlement setelah
 *   EXPIRED (bayar di detik terakhir) tetap menang karena gateway = sumber kebenaran.
 * - gross_amount dicocokkan dengan nominal transaksi sebelum menerima PAID.
 *
 * Konfigurasi: daftarkan URL ini di Dashboard Midtrans → Settings → Configuration →
 * "Payment Notification URL": https://<domain>/api/payment/webhook
 */
export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json().catch(() => null)) as {
      order_id?: string;
      status_code?: string;
      gross_amount?: string;
      signature_key?: string;
      transaction_status?: string;
      fraud_status?: string;
    } | null;

    if (!payload || !payload.order_id || !payload.transaction_status) {
      return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
    }

    // 1. Verifikasi signature — tolak semua notifikasi palsu
    const valid = verifyMidtransSignature(
      payload.order_id,
      payload.status_code ?? "",
      payload.gross_amount ?? "",
      payload.signature_key
    );
    if (!valid) {
      console.error("[payment/webhook] signature TIDAK VALID untuk", payload.order_id);
      return NextResponse.json({ error: "Signature tidak valid" }, { status: 403 });
    }

    // 2. Cari transaksi internal berdasarkan reference = order_id Midtrans
    const payment = await db.payment.findUnique({
      where: { reference: payload.order_id },
      include: { order: { select: { totalPrice: true } } },
    });
    if (!payment) {
      // Bukan transaksi kita (atau env beda) — balas 200 agar gateway berhenti retry
      return NextResponse.json({ ok: true, ignored: true });
    }

    // 3. Cocokkan nominal — webhook dengan nominal beda tidak boleh menyatakan PAID
    const notifiedAmount = Number(payload.gross_amount);
    if (Number.isFinite(notifiedAmount) && notifiedAmount + 0.5 < payment.amount) {
      console.error(
        `[payment/webhook] nominal beda: notif ${payload.gross_amount} vs order ${payment.amount}`
      );
      return NextResponse.json({ ok: true, ignored: true, reason: "amount-mismatch" });
    }

    // 4. Mapping status gateway → status internal
    const next = mapMidtransStatus(payload.transaction_status, payload.fraud_status);
    if (!next) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    // 5. Transisi status (idempoten & anti-regresi)
    let finalStatus: string = next;
    if (payment.status === "PAID" && next !== "PAID") {
      // Uang sudah masuk — tidak bisa "dibatalkan" oleh notifikasi lain
      finalStatus = "PAID";
    }

    const updated = await db.payment.update({
      where: { id: payment.id },
      data: {
        status: finalStatus,
        paidAt: finalStatus === "PAID" ? (payment.paidAt ?? new Date()) : payment.paidAt,
        rawPayload: JSON.stringify(payload).slice(0, 4000),
      },
    });

    console.log(
      `[payment/webhook] ${payload.order_id}: ${payment.status} -> ${updated.status} (${payload.transaction_status})`
    );
    return NextResponse.json({ ok: true, status: updated.status });
  } catch (err) {
    console.error("[payment/webhook] gagal:", err);
    // 500 → Midtrans akan retry otomatis
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
