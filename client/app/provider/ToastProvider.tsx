"use client";

import { useEffect } from "react";
import toast, { Toaster, useToasterStore } from "react-hot-toast";

export function ToasterProvider() {
  const { toasts } = useToasterStore();
  
  useEffect(() => {
    toasts
      .filter((t) => t.visible)
      .filter((_, i) => i >= 4)
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