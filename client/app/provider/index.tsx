"use client";

import ReactQueryProvider from "./ReactQueryProvider";
import { ToasterProvider } from "./ToastProvider";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
export default function RootProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReactQueryProvider>
      <ToasterProvider  />{" "}
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
    </ReactQueryProvider>
  );
}