"use client";

import ReactQueryProvider from "./ReactQueryProvider";
import { ToasterProvider } from "./ToastProvider";
import { AuthProvider } from "./AuthProvider";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export default function RootProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReactQueryProvider>
      <AuthProvider>
        <ToasterProvider />
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </ReactQueryProvider>
  );
}