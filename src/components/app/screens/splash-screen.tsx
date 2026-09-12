"use client";

import { motion } from "framer-motion";
import { JrMark } from "../brand";

export default function SplashScreen() {
  return (
    <div className="min-h-screen w-full relative flex flex-col items-center justify-center overflow-hidden">
      {/* Floating decorative circles */}
      <motion.div
        className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-white/10"
        animate={{ y: [0, 18, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 -right-20 h-64 w-64 rounded-full bg-white/10"
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-20 left-1/4 h-72 w-72 rounded-full bg-black/5"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* JR logo — connected monogram directly on the gradient, no white card */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="relative z-10"
      >
        <JrMark className="h-32 w-32 drop-shadow-[0_18px_35px_rgba(0,0,0,0.28)]" ink="#ffffff" leaf="#6ee7a0" />
        <motion.span
          className="absolute -right-3 -top-1 rounded-full bg-amber-400 px-2 py-1 text-[9px] font-black text-teal-950 shadow-lg"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.25, 1] }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          HEMAT!
        </motion.span>
      </motion.div>

      <motion.h1
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25, type: "spring", stiffness: 200, damping: 20 }}
        className="relative z-10 mt-6 text-4xl font-black tracking-tight text-white drop-shadow-sm"
      >
        Jajan<span className="text-emerald-200">Riyen</span>
      </motion.h1>

      <motion.p
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 mt-2 text-sm font-medium text-teal-50/90"
      >
        Jajan lokal, hemat terus ✨
      </motion.p>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5, duration: 0.9, ease: "easeInOut" }}
        className="relative z-10 mt-8 h-1.5 w-40 origin-left rounded-full bg-white/30"
      >
        <motion.div
          className="h-full w-1/2 rounded-full bg-white"
          animate={{ x: ["0%", "100%", "100%", "0%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
}
