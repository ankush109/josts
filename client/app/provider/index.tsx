"use client";

/**
 * @fileoverview Root application provider.
 *
 * Composes all context providers in the correct nesting order:
 *  1. ThemeProvider  – light/dark/system theme
 *  2. ReactQueryProvider – TanStack Query cache
 *  3. AuthProvider – authenticated user context
 *  4. ToasterProvider – global toast notifications
 *  5. ReactQueryDevtools – dev-only query inspector (stripped in production)
 *
 * Usage: wrap the root layout with `<RootProvider>`.
 */

import { ThemeProvider } from "next-themes";
import ReactQueryProvider from "./ReactQueryProvider";
import { ToasterProvider } from "./ToastProvider";
import { AuthProvider } from "./AuthProvider";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import SyncQueueRunner from "../components/SyncQueueRunner";

/**
 * Wraps the entire application with all required context providers.
 *
 * @param children - The page / layout content to wrap
 */
export default function RootProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ReactQueryProvider>
        <AuthProvider>
          <ToasterProvider />
          <SyncQueueRunner />
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </AuthProvider>
      </ReactQueryProvider>
    </ThemeProvider>
  );
}
