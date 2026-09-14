"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // registrace selhala (např. dev přes http bez localhost) — appka funguje i bez ní
    });
  }, []);
  return null;
}
