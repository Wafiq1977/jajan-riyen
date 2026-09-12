"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShieldCheck, Smartphone, Loader2, MessageCircle, KeyRound, TimerReset } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import type { User } from "@/lib/types";
import { BrandWordmark } from "../brand";

type OtpVia = "whatsapp" | "sms" | null;

export default function LoginScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [via, setVia] = useState<OtpVia>(null);
  const [devCode, setDevCode] = useState<string | null>(null); // hanya saat gateway WA/SMS belum diatur

  const digits = phone.replace(/\D/g, "");
  const phoneValid = digits.length >= 9 && digits.length <= 15;

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const requestOtp = async () => {
    if (!phoneValid || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim kode");
      setVia(data.via ?? null);
      setDevCode(data.devMode ? String(data.devCode) : null);
      setOtp("");
      setStep("otp");
      setCountdown(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim kode");
    } finally {
      setLoading(false);
    }
  };

  const verifyAndLogin = async (code: string) => {
    if (code.length !== 6 || verifying || loading) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kode salah");
      onLogin(data.user as User);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal verifikasi");
      setOtp("");
    } finally {
      setVerifying(false);
    }
  };

  const channelLabel = via === "sms" ? "SMS" : "WhatsApp";

  return (
    <div className="min-h-full min-h-screen w-full bg-white">
      {/* Decorative header */}
      <div className="relative bg-brand-gradient px-6 pb-16 pt-12 rounded-b-[2.5rem] overflow-hidden">
        <motion.div
          className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10"
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-8 top-24 h-16 w-16 rounded-full bg-white/10"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative z-10">
          <BrandWordmark light size="md" />
          <h1 className="mt-7 text-[24px] font-extrabold leading-snug text-white sm:text-[26px]">
            Selamat datang! 👋
          </h1>
          <p className="mt-1 text-sm text-teal-50/90">
            Masuk dengan nomor teleponmu, gratis &amp; tanpa ribet.
          </p>
        </div>
      </div>

      <div className="relative z-10 px-6 -mt-8 pb-10">
        <motion.div layout className="rounded-3xl bg-white p-6 card-soft border border-teal-50">
          <AnimatePresence mode="wait">
            {step === "phone" ? (
              <motion.div
                key="phone-step"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Smartphone className="h-4 w-4 text-primary" />
                  Nomor Telepon
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-2xl border border-input bg-muted/40 px-4 py-3.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30 transition-all">
                  <span className="flex shrink-0 items-center gap-1.5 border-r border-border pr-2.5 text-sm font-bold text-foreground">
                    🇮🇩 +62
                  </span>
                  <input
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="81234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 14))}
                    onKeyDown={(e) => e.key === "Enter" && requestOtp()}
                    className="w-full min-w-0 flex-1 bg-transparent text-base font-semibold tracking-wide outline-none placeholder:text-slate-300"
                    aria-label="Nomor telepon"
                  />
                </div>
                {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}

                <Button
                  onClick={requestOtp}
                  disabled={!phoneValid || loading}
                  className="press mt-5 h-12 w-full rounded-2xl bg-primary text-base font-bold shadow-lg shadow-teal-500/30 hover:bg-teal-700 disabled:opacity-40"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <MessageCircle className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                      Kirim Kode via WhatsApp
                    </span>
                  )}
                </Button>

                <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  Kode verifikasi dikirim ke nomormu via WhatsApp (atau SMS). Kami tidak akan pernah
                  menanyakan kode ini lewat telepon.
                </p>

                <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
                  Dengan masuk, kamu setuju dengan Syarat &amp; Ketentuan serta Kebijakan Privasi
                  Jajan Riyen.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
              >
                <button
                  onClick={() => {
                    setStep("phone");
                    setError(null);
                    setDevCode(null);
                  }}
                  className="press mb-3 flex items-center gap-1 text-sm font-semibold text-primary"
                >
                  <ArrowLeft className="h-4 w-4" /> Ubah nomor
                </button>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <KeyRound className="h-4 w-4 text-primary" />
                  Masukkan Kode Verifikasi
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  6 digit kode dikirim via <span className="font-bold text-foreground">{channelLabel}</span> ke{" "}
                  <span className="font-bold text-foreground">+62{digits}</span>
                </p>

                {devCode && (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-700">
                    <span className="font-extrabold">⚙️ Mode pengembangan</span> — gateway WA/SMS
                    belum dikonfigurasi di server. Kode kamu:{" "}
                    <span className="font-mono text-sm font-extrabold tracking-widest">{devCode}</span>
                    <span className="mt-1 block text-[10px] text-amber-600">
                      Untuk pengiriman beneran, isi FONNTE_TOKEN / WABLAS_TOKEN / Twilio di file .env
                      (lihat PANDUAN-DEPLOY.md).
                    </span>
                  </div>
                )}

                <div className="mt-4 flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(v) => {
                      setOtp(v);
                      if (v.length === 6) verifyAndLogin(v);
                    }}
                    disabled={verifying}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && <p className="mt-3 text-center text-xs font-medium text-red-500">{error}</p>}

                <Button
                  onClick={() => verifyAndLogin(otp)}
                  disabled={otp.length !== 6 || verifying}
                  className="press mt-5 h-12 w-full rounded-2xl bg-primary text-base font-bold shadow-lg shadow-teal-500/30 hover:bg-teal-700 disabled:opacity-40"
                >
                  {verifying ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verifikasi & Masuk"}
                </Button>

                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Belum menerima kode?{" "}
                  {countdown > 0 ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-400">
                      <TimerReset className="h-3 w-3" /> kirim ulang dalam {countdown}s
                    </span>
                  ) : (
                    <button
                      onClick={requestOtp}
                      disabled={loading}
                      className="font-bold text-primary hover:underline"
                    >
                      Kirim ulang kode
                    </button>
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] font-medium text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Semua pengguna otomatis berstatus pembeli
        </div>
      </div>
    </div>
  );
}
