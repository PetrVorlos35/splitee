"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // V dev režimu by cache-first na /_next/static servíroval staré chunky
    // a změny v kódu by se neprojevily — tam ho naopak odregistrujeme.
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => void r.unregister()));
      if ("caches" in window) void caches.keys().then((keys) => keys.forEach((k) => void caches.delete(k)));
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // registrace selhala — appka funguje i bez ní
    });
  }, []);
  return null;
}
