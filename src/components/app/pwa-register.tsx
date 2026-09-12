"use client";

import { useEffect } from "react";

/**
 * Registrasi Service Worker (hanya production) + tangkap event
 * `beforeinstallprompt` agar tombol "Install Aplikasi" bisa memicu
 * dialog instalasi PWA bawaan Android/Chrome.
 */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as unknown as { __jrInstallPrompt?: Event }).__jrInstallPrompt = e;
      window.dispatchEvent(new CustomEvent("jr:installable"));
    };

    window.addEventListener("load", onLoad);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => {
      window.removeEventListener("load", onLoad);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  return null;
}
