"use client";

/**
 * @fileoverview Slim banner shown when the device is offline.
 *
 * Renders nothing when online. Designed to sit directly under the Navbar
 * (which is `fixed` with `h-16`), pushing nothing — it's `fixed` itself.
 */

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-16 left-0 right-0 z-40 bg-amber-500/95 text-amber-950 backdrop-blur"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center gap-2 text-sm font-medium">
        <WifiOff className="h-4 w-4" />
        <span>You&apos;re offline. Changes are saved on this device and will sync automatically when you reconnect.</span>
      </div>
    </div>
  );
}
