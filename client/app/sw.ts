/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NavigationRoute, NetworkFirst, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const APP_SHELL_CACHE = "app-shell-v2";

/**
 * Routes pre-warmed at SW install so they're available offline even if the
 * user never opened them while online. The actual route HTML is server-rendered
 * by Next.js, so we have to fetch + cache it ourselves — the Serwist precache
 * manifest only covers static `_next/static/*` assets.
 */
const APP_SHELL_ROUTES = [
  "/",
  "/offline",
  "/calibration",
  "/calibration/create",
];

/**
 * Shell HTML for the dynamic `/calibration/[reportId]` route. Fetched with a
 * placeholder id at SW install so any offline navigation to a local draft
 * (e.g. `/calibration/local-abc123`) can be served the same shell. The page
 * reads the real id from `window.location` after hydration and loads the
 * draft from IndexedDB.
 */
const CALIB_DETAIL_SHELL_KEY = "/calibration/__offline_shell__";
const CALIB_DETAIL_PATTERN = /^\/calibration\/[^/]+$/;
const CALIB_EXCLUDED_SUBPATHS = new Set(["create"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      await Promise.all(
        APP_SHELL_ROUTES.map(async (url) => {
          try {
            const res = await fetch(url, { credentials: "same-origin" });
            if (res.ok) await cache.put(url, res.clone());
          } catch {
            /* installing offline — skip */
          }
        }),
      );
      try {
        const res = await fetch(CALIB_DETAIL_SHELL_KEY, { credentials: "same-origin" });
        if (res.ok) await cache.put(CALIB_DETAIL_SHELL_KEY, res.clone());
      } catch {
        /* installing offline — skip */
      }
    })(),
  );
});

const navigationStrategy = new NetworkFirst({
  cacheName: APP_SHELL_CACHE,
  networkTimeoutSeconds: 5,
});

const navigationRoute = new NavigationRoute(async (params) => {
  try {
    return await navigationStrategy.handle(params);
  } catch {
    const cache = await caches.open(APP_SHELL_CACHE);
    const exact = await cache.match(params.request.url);
    if (exact) return exact;
    const pathname = new URL(params.request.url).pathname;
    const m = pathname.match(CALIB_DETAIL_PATTERN);
    if (m && !CALIB_EXCLUDED_SUBPATHS.has(pathname.split("/")[2] ?? "")) {
      const shell = await cache.match(CALIB_DETAIL_SHELL_KEY);
      if (shell) return shell;
    }
    const offline = await cache.match("/offline");
    if (offline) return offline;
    const root = await cache.match("/");
    if (root) return root;
    return Response.error();
  }
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: (options) => navigationRoute.match(options),
      handler: (options) => navigationRoute.handler.handle(options),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
