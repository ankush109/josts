"use client";

/**
 * @fileoverview React Query client provider with IndexedDB persistence.
 *
 * Creates a stable `QueryClient` and wraps it with `PersistQueryClientProvider`
 * so that the query cache survives page reloads and the app can serve stale
 * data when offline.
 *
 * Storage backend: `idb-keyval` (IndexedDB). 7-day buster controlled by
 * `maxAge`; bump `buster` to force-clear the cache on a breaking app release.
 */

import { useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";

const CACHE_DB_KEY     = "josts:query-cache";
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_BUSTER     = "v1";

const idbStorage = {
  getItem:    (key: string) => get(key) as Promise<string | null>,
  setItem:    (key: string, value: string) => set(key, value),
  removeItem: (key: string) => del(key),
};

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
            staleTime: 30_000,
            gcTime:    CACHE_MAX_AGE_MS,
            retry:     1,
            // When offline, don't bang the network — let cached data serve.
            networkMode: "offlineFirst",
          },
          mutations: {
            networkMode: "offlineFirst",
          },
        },
      }),
  );

  const [persister] = useState(() =>
    createAsyncStoragePersister({
      storage:    idbStorage,
      key:        CACHE_DB_KEY,
      throttleTime: 1000,
    }),
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge:  CACHE_MAX_AGE_MS,
        buster:  CACHE_BUSTER,
        dehydrateOptions: {
          // Only persist successful queries — failed queries shouldn't replay on next load
          shouldDehydrateQuery: (q) => q.state.status === "success",
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
