"use client";

import { useEffect } from "react";

/**
 * Registers the Serwist-generated service worker (`/sw.js`) once on mount.
 * In development the SW is disabled (see next.config.ts `disable` flag) so this
 * registration silently no-ops if the file does not exist.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => {
        console.warn("[SW] registration failed", err);
      });
  }, []);

  return null;
}
