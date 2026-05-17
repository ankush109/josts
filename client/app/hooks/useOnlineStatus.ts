"use client";

/**
 * @fileoverview Reactive online/offline status.
 *
 * Wraps `navigator.onLine` + window `online`/`offline` events, and also
 * notifies TanStack Query's `onlineManager` so paused mutations resume on
 * reconnect.
 *
 * Returns `true` during SSR / initial render (assume online to avoid a flash
 * of offline UI before hydration).
 */

import { useEffect, useState } from "react";
import { onlineManager } from "@tanstack/react-query";

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(true);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);

    const handleOnline  = () => { setOnline(true);  onlineManager.setOnline(true); };
    const handleOffline = () => { setOnline(false); onlineManager.setOnline(false); };

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}
