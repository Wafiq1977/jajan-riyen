"use client";

import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";

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

      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="relative z-10 flex h-24 w-24 items-center justify-center rounded-[28px] bg-white shadow-2xl shadow-teal-900/20"
      >
        <ShoppingBag className="h-12 w-12 text-primary" strokeWidth={1.8} />
        <motion.span
          className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-[10px] font-extrabold text-teal-950 shadow-lg"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.25, 1] }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          %SALE
        </motion.span>
      </motion.div>

      <motion.h1
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25, type: "spring", stiffness: 200, damping: 20 }}
        className="relative z-10 mt-6 text-5xl font-extrabold tracking-tight text-white drop-shadow-sm"
      >
        TOSKA
      </motion.h1>

      <motion.p
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 mt-2 text-sm font-medium text-teal-50/90"
      >
        Belanja lokal, hemat terus ✨
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
