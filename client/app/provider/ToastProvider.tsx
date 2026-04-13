"use client";

/**
 * @fileoverview Toast notification provider.
 *
 * Renders the react-hot-toast `Toaster` and enforces a maximum of 4
 * visible toasts at a time to prevent notification flooding.
 */

import { useEffect } from "react";
import toast, { Toaster, useToasterStore } from "react-hot-toast";

/** Maximum number of toasts shown simultaneously. */
const MAX_VISIBLE_TOASTS = 4;

/**
 * Mounts the global toast container and trims the queue when it exceeds
 * `MAX_VISIBLE_TOASTS`.
 *
 * Place this once near the root of the application (inside `RootProvider`).
 */
export function ToasterProvider() {
  const { toasts } = useToasterStore();

  /** Dismiss excess toasts when the queue grows beyond the limit. */
  useEffect(() => {
    toasts
      .filter((t) => t.visible)
      .slice(MAX_VISIBLE_TOASTS)
      .forEach((t) => toast.dismiss(t.id));
  }, [toasts]);

  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      toastOptions={{ duration: 5000 }}
    />
  );
}
