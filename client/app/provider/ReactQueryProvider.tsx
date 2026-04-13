"use client";

/**
 * @fileoverview React Query client provider.
 *
 * Creates a stable `QueryClient` instance (via `useState` so it is only
 * instantiated once per component tree, not re-created on every render)
 * and exposes it to the component tree via `QueryClientProvider`.
 */

import { useState } from "react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

/**
 * Wraps children with a React Query `QueryClientProvider`.
 *
 * The `QueryClient` is created once per mount using `useState` initialiser
 * so it survives re-renders without being recreated.
 *
 * @param children - The component subtree that needs query access
 */
export default function ReactQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,   // treat cached data as fresh for 30 s
            retry: 1,            // retry once on network failure
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
