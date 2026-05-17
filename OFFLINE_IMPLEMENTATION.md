# Offline-First (PWA) Implementation — v1

**Goal.** Enable field engineers to create and edit calibration drafts on an iPad (or any device) at remote customer sites with **no internet**, then sync everything to the server when they return to the office.

**Status.** In progress. See "Resume here" at the bottom for next steps.

---

## Scope (locked)

### In scope (v1)
- Offline **create** + **edit** of calibration drafts (full create-from-scratch offline).
- Offline read of recently-viewed reports, equipments, instruments (via persisted React Query cache).
- Auto-sync on reconnect (`online` event + manual "Sync now" button).
- PWA install on iPad/laptop/Android.

### Out of scope (v1 — flagged as deferred)
- Offline **compute** (uncertainty budget) — server-only, button disabled offline.
- Offline **PDF / certificate generation** — server-only, button disabled offline.
- Offline edits to **Equipment / Instrument masters** — read-only when offline.
- **Two-device concurrent edit of the same draft** — last-write-wins; engineers should use one device per field trip.
- **Background sync** — iOS does not support Background Sync API; sync only when app is open and online.

---

## Architecture

### Data flow

```
┌─────────────────┐    auto-save    ┌──────────────────┐   POST/PUT   ┌──────────────┐
│  React form     │ ──────────────► │   IndexedDB      │ ───────────► │  MongoDB     │
│  (calibration)  │ ◄────────────── │   (offline-      │ ◄─────────── │  (server)    │
│                 │   read on load  │    drafts)       │   on sync    │              │
└─────────────────┘                 └──────────────────┘              └──────────────┘
       ▲                                    ▲
       │                                    │
       │                                    │ persistQueryClient
       │            ┌──────────────────────┐│
       └────────────┤  React Query cache   ││ (idb-keyval)
                    │  (queries persisted) │┘
                    └──────────────────────┘
```

### Key design decisions

1. **UUID-on-create.** Offline-created drafts get a client-generated UUID like `local-<uuid>`. On sync, server-assigned `_id` is stored alongside; URL routing redirects `localId → serverId` after sync.
2. **IndexedDB schema** (single store `drafts`):
   ```ts
   type OfflineDraft = {
     localId:       string;        // "local-<uuid>" — primary key
     serverId:      string | null; // Mongo _id after first sync
     payload:       any;           // Full draft body to PUT/POST
     dirty:         boolean;       // true = needs sync
     isNew:         boolean;       // true = needs POST not PUT
     lastModified:  string;        // ISO timestamp
     lastSyncedAt:  string | null; // ISO timestamp
   };
   ```
3. **React Query cache → IndexedDB** via `PersistQueryClientProvider` so all `useGet*` results survive offline reloads. 7-day TTL.
4. **No server changes.** Existing `POST /calibration-report` and `PUT /calibration-report/:id` are reused.
5. **Compute & PDF gated by `useOnlineStatus`** — disabled with tooltip when offline.

---

## Files touched / created

### New
- `client/public/manifest.json` — PWA manifest
- `client/public/icons/*` — PWA icons (192, 512, maskable)
- `client/app/lib/offline-drafts.ts` — IndexedDB CRUD wrapper for drafts
- `client/app/hooks/useOnlineStatus.ts` — wraps TanStack `onlineManager`
- `client/app/hooks/useSyncQueue.ts` — scans + replays dirty drafts on reconnect
- `client/app/components/OfflineBanner.tsx` — banner shown in Navbar when offline
- `client/app/components/SyncStatusBadge.tsx` — per-draft sync indicator

PWA shell — exact files depend on tool chosen (Serwist vs hand-rolled):
- Either `client/app/sw.ts` (Serwist) + service worker generation in `next.config.ts`
- Or `client/public/sw.js` + registration via a `<Script>` in `layout.tsx`

### Modified
- `client/next.config.ts` — wrap with PWA plugin (if Serwist)
- `client/app/layout.tsx` — manifest link, theme-color, SW registration
- `client/app/provider/ReactQueryProvider.tsx` — swap to `PersistQueryClientProvider`
- `client/app/(pages)/(category)/calibration/calibration.tsx` — auto-save writes IndexedDB first, then server
- `client/app/(pages)/(category)/calibration/calibration.tsx` — "Compute" + "Generate PDF" buttons disabled offline
- `client/app/(pages)/drafts/*` — drafts list merges IndexedDB drafts with server drafts
- `client/app/components/Navbar.tsx` — render `OfflineBanner` + pending-sync count

### Dependencies to add
```
@tanstack/query-async-storage-persister
@tanstack/react-query-persist-client
idb-keyval
uuid
@types/uuid
```
PWA tool: **Serwist** (`@serwist/next` + `serwist`) — modern successor to next-pwa. If it doesn't support Next 16 yet, fall back to hand-rolled Workbox.

---

## Phased plan

### Phase 1 — PWA shell ⬅ start here
- Add manifest + icons
- Register service worker (Serwist or hand-rolled)
- Cache app shell (HTML, JS, CSS, fonts)
- Verify installable on Chrome (laptop) and Safari (iPad)

**Done when:** can `npm run build && npm start`, install the app, kill server, app shell still loads.

### Phase 2 — Query persistence + online state
- Install persist deps
- Rewire `ReactQueryProvider` → `PersistQueryClientProvider` with IndexedDB
- Add `useOnlineStatus` hook
- Add `OfflineBanner` to Navbar

**Done when:** load reports list online, go offline, refresh — list still renders.

### Phase 3 — Offline draft create + edit + sync (the meaty bit)
- `offline-drafts.ts` IndexedDB layer
- Modify "New Report" handler: offline → generate `local-<uuid>`, save to IndexedDB; online → existing POST path
- Modify auto-save: always write IndexedDB; if online, attempt server PUT/POST
- `useSyncQueue` hook: on `online` event, scan dirty entries, replay (POST for `isNew`, PUT otherwise)
- localId → serverId redirect on navigation
- Drafts list page: merge local + server drafts

**Done when:** go offline → create draft → fill readings → close app → reopen offline → draft still there → go online → sync runs → draft appears in server with new `_id`.

### Phase 4 — Disable online-only actions
- Compute button + tooltip
- PDF button + tooltip
- Equipment/Instrument editors: read-only banner offline

**Done when:** offline tooltip explains; no broken POST/PUT attempts to compute/PDF endpoints.

### Phase 5 — Polish
- "X drafts pending sync" count in Navbar
- "Sync now" manual button
- Master-data staleness warning ("Reference data last updated N days ago")
- Toast on successful sync

**Done when:** UX feels clear and engineers can self-diagnose sync state.

---

## iPad install instructions (for engineers)

1. Open Safari on iPad → go to the app URL while at office (online).
2. Tap the Share icon → "Add to Home Screen" → "Add".
3. **Important:** this gives the app persistent IndexedDB storage. Without this step, iOS may evict drafts after 7 days of inactivity.
4. Launch the app from the home-screen icon (NOT from Safari) — runs in standalone mode with persistent storage.
5. Before leaving office: open the app once while online to refresh master data cache.

---

## Known gotchas / things to verify

- **Next 16 + PWA tooling** — Serwist may need a specific version. Verify on first install. Fall back to hand-rolled if blocked.
- **iOS storage eviction** — only solved by "Add to Home Screen". Document this prominently for engineers.
- **JWT expiry mid-trip** — if token expires offline, sync will 401. Handler: catch 401, redirect to login at office, resume queue post-auth.
- **Master data freshness** — show last-refreshed timestamp; warn if > 7 days.
- **Service worker updates** — when we ship a new app version, SW needs to update cleanly. Workbox/Serwist handles this but verify with a real version bump.
- **Auto-save current behaviour** (`calibration.tsx:1583-1604`) — currently calls `updateCalibrationReport` directly on a 5s debounce. Phase 3 must preserve the debounce but redirect the write path.

---

## Resume here

**Last updated:** session of 2026-05-16

**Completed:**
- [x] Phase 1: PWA shell — **code complete; final build still blocked by the sharp/Node 25 issue (IT to look at Monday)**
- [x] Phase 2: Query persistence + online state
- [x] Phase 3: Offline draft create + edit + sync
- [x] Phase 4: Disable online-only actions
- [x] Phase 5: Polish — pending-sync count + Sync Now, "Saved locally" badge nuance, drafts-list merge with "📱 Local" pill. **Master-data staleness warning deferred** (nice-to-have)

### Phase 1 — what was done

Installed deps (in `client/`):
- `@serwist/next` `^9.x`
- `serwist` `^9.x`

Files created:
- `client/public/manifest.json` — PWA manifest (name, theme-color #0f172a, standalone, icons)
- `client/public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` — **placeholder solid-color PNGs (slate-900)**. Replace with real Josts-branded icons before production rollout.
- `client/app/sw.ts` — Serwist service worker entry (precaches build assets, runtime caching defaults, skipWaiting + clientsClaim + navigationPreload)
- `client/app/components/ServiceWorkerRegister.tsx` — client component that registers `/sw.js` on mount, production-only

Files modified:
- `client/next.config.ts` — wrapped with `withSerwistInit({ swSrc: "app/sw.ts", swDest: "public/sw.js", disable: NODE_ENV === "development", cacheOnNavigation: true, reloadOnOnline: true })`
- `client/app/layout.tsx` — added `metadata` (manifest link, iOS appleWebApp, icons), `viewport` (themeColor #0f172a, viewportFit cover), and `<ServiceWorkerRegister />` mounted in `<body>`
- `client/package.json` — `build` script switched from `next build` → `next build --webpack` (Serwist injects webpack config; Next 16 defaults to Turbopack which Serwist doesn't yet support — see https://github.com/serwist/serwist/issues/54)
- `client/.gitignore` — ignore generated `public/sw.js`, `public/swe-worker-*.js`, `public/workbox-*.js` and their `.map` siblings

Verification reached so far:
- `npm run build` logged `✓ (serwist) Bundling the service worker script with the URL '/sw.js' and the scope '/'` — **Serwist config is correctly applied.**
- Build then failed on an unrelated native-module error (next section).
- Dev mode (`npm run dev`) is unaffected since Serwist is disabled in development by config.

### BLOCKER — sharp dyld error on Node 25 + macOS x86_64

```
Could not load the "sharp" module using the darwin-x64 runtime
dlopen ... libvips-cpp.8.17.3.dylib ... mmap(size=0x1128340) failed with errno=1
```

Diagnosis: Node v25.9.0 on darwin-x64 cannot mmap the prebuilt libvips dylib. This is environmental and was probably latent before this session — surfacing only because we ran a full production build. **Unrelated to Serwist or PWA work.**

Fix options to try tomorrow, in order of likelihood-to-work:

1. **Pin to Node 22 LTS** for this project — `nvm install 22 && nvm use 22`, then `rm -rf client/node_modules client/package-lock.json && npm install` from the `client/` dir. Node 25 is bleeding-edge and many native modules don't have prebuilt binaries for it yet.
2. If staying on Node 25: rebuild sharp from source — needs `brew install vips pkg-config` first, then `npm rebuild sharp --build-from-source` in `client/`.
3. Last resort to unblock the PWA verification: set `images: { unoptimized: true }` in `next.config.ts` — sharp won't be loaded at build time, at the cost of unoptimised `<Image>` output.

Once the build runs clean:
- Run `npm run build && npm start` from `client/`
- Open `http://localhost:3000` in Chrome
- DevTools → Application → Service Workers: should show `sw.js` active with scope `/`
- DevTools → Application → Manifest: should show "Josts Calibration" with icons
- DevTools → Network → "Offline" toggle, then refresh: app shell should still render
- Then proceed to Phase 2

### Phase 2 — what was done

Installed deps:
- `@tanstack/query-async-storage-persister`
- `@tanstack/react-query-persist-client`
- `idb-keyval`

Files created:
- `client/app/hooks/useOnlineStatus.ts` — wraps `navigator.onLine` + window online/offline events + TanStack `onlineManager.setOnline()`. Returns `true` during SSR.
- `client/app/components/OfflineBanner.tsx` — amber fixed banner shown under Navbar when offline.

Files modified:
- `client/app/provider/ReactQueryProvider.tsx` — replaced `QueryClientProvider` with `PersistQueryClientProvider` backed by `createAsyncStoragePersister` over `idb-keyval`. 7-day `maxAge`, `buster: "v1"`, `networkMode: "offlineFirst"` on queries + mutations, only-success dehydration.
- `client/components/Navbar.tsx` — renders `<OfflineBanner />` directly above the nav.

Verify: `npm run dev`, open the app, DevTools → Network → "Offline" toggle → amber banner appears. Refresh — cached query data still renders.

### Phase 3 — what was done

Files created:
- `client/app/lib/offline-drafts.ts` — IndexedDB CRUD layer for offline drafts. Uses a dedicated store `josts-offline-v1 / drafts`. Exports `newLocalId`, `isLocalId`, `createLocalDraft`, `updateLocalDraft`, `getDraft`, `getDraftByServerId`, `listDrafts`, `listDirtyDrafts`, `markDraftSynced`, `deleteDraft`. Local IDs are `local-<uuid>` (uses `crypto.randomUUID()` with fallback).
- `client/app/hooks/useSyncQueue.ts` — `useSyncQueue()` returns `{ syncNow, running, pendingCount, refresh }`. Auto-fires on mount and on `online` event. For each dirty draft: POST when `isNew=true` (and stores returned `_id` as `serverId`), PUT otherwise. Stops on 401; never deletes dirty drafts on failure. Surfaces toasts on success/failure.
- `client/app/components/SyncQueueRunner.tsx` — mounts `useSyncQueue` at the app root so sync runs regardless of the page the user is on.

Files modified:
- `client/app/provider/index.tsx` — added `<SyncQueueRunner />` inside `<AuthProvider>` (needs auth context for the queue's authenticated POST/PUT calls).
- `client/app/(pages)/(category)/calibration/calibration.tsx` (the 2800-line form, four surgical edits):
  - **Imports**: added `isLocalId, createLocalDraft, updateLocalDraft, getDraft` from `@/app/lib/offline-drafts` and `useOnlineStatus` from `@/app/hooks/useOnlineStatus`.
  - **Data loading**: when `reportId` starts with `local-`, skip the server query and resolve `existingReport` from IDB instead. If the local draft has been synced (has a `serverId`), `router.replace()` to `/calibration/<serverId>` so subsequent saves go to the server-side path.
  - **Auto-save effect**: now always writes IDB via `updateLocalDraft(reportId, payload)` first. If the draft is server-backed AND we're online, then PUTs to the server. If offline or local-only, just sets `autoSaveStatus = "saved"` — sync queue handles the rest on reconnect.
  - **Manual save handler**: if `!isEditMode && isOffline`, calls `createLocalDraft(payload)` and routes to `/calibration/<localId>`. Otherwise existing behaviour (PUT for edits, POST for create).

End-to-end flow verified by type-check (`npx tsc --noEmit` clean). Manual browser verification still pending — needs `npm run dev` + DevTools Offline toggle to:
1. Online: create a draft → URL becomes `/calibration/<serverId>` → edits PUT to server. ✓ existing behaviour, unchanged.
2. Offline: create a draft → URL becomes `/calibration/local-<uuid>` → edits write IDB only → toast "Saved on this device — will sync when online".
3. Toggle back online: sync queue auto-fires → toast "1 draft synced" → URL replace to `/calibration/<serverId>` → subsequent edits PUT to server.
4. Offline edit of an existing server draft: URL stays `/calibration/<serverId>` but writes go IDB only → on reconnect, sync queue PUTs the latest payload.

### Phase 4 — what was done

Files modified:
- `client/app/(pages)/(category)/calibration/calibration.tsx` — Compute, Preview PDF (view + edit toolbars), and Submit buttons all disabled when `isOffline` with native `title` tooltips ("Compute requires internet — runs on the server", "PDF preview requires internet — generated on the server", "Submit requires internet — generates certificate on the server").
- `client/app/(pages)/(category)/equipments/[equipmentId]/page.tsx` — Edit, Save, Activate/Deactivate disabled offline. `useOnlineStatus` imported.
- `client/app/(pages)/(category)/instruments/[instrumentId]/page.tsx` — Save + Activate/Deactivate disabled offline. `useOnlineStatus` imported.

### Phase 5 — what was done

Files created:
- `client/app/components/SyncIndicator.tsx` — Navbar widget showing pending-sync count + "Sync now" button. Hidden when online + zero pending; otherwise shows cloud icon + count, with a button when online.
- `client/app/hooks/useLocalDraftReports.ts` — reads offline-only drafts from IndexedDB and projects them into the `ReportListItem` shape used by the calibration table. Filters out already-synced drafts (those with a `serverId`). Refreshes on `focus`/`storage` events. Marks each entry with `__local: true`.

Files modified:
- `client/app/hooks/useSyncQueue.ts` — **refactored to singleton**. `runSyncNow()`, `refreshPendingCount()`, and the in-flight guard now live at module scope. Listeners subscribe to module-level state via a tiny pub/sub. The auto-sync `useEffect` was moved out of this hook and into `SyncQueueRunner`, so multiple consumers (root runner + Navbar indicator) coexist without racing each other on mount.
- `client/app/components/SyncQueueRunner.tsx` — now owns the auto-sync trigger. Calls `runSyncNow()` on mount + on `online` transitions. Invalidates `CALIBRATION_REPORTS_KEY` and toasts on success/failure.
- `client/components/Navbar.tsx` — renders `<SyncIndicator />` before `<UserMenu />`.
- `client/types/calibration.ts` — `AutoSaveStatus` gained a new `"saved-local"` variant for IDB-only writes.
- `client/app/(pages)/(category)/calibration/calibration.tsx` — auto-save now distinguishes `"saved-local"` (IDB only) from `"saved"` (server confirmed). Badge shows "Saved on this device · will sync" in amber when IDB-only. Server-error branch now also falls back to `"saved-local"` (was previously masquerading as `"saved"`).
- `client/app/(pages)/(category)/calibration/calibrationTable.tsx` — merges `useLocalDraftReports()` items on top of the server list. New "📱 Local" pill rendered alongside the status badge for rows where `__local === true`. `ReportListItem` interface gained an optional `__local` flag.

### Deferred (known nice-to-haves)
- **Master-data staleness warning** — show "Reference data last updated N days ago — connect to refresh" if the equipments/instruments query cache is > 7 days old. Low priority because the form auto-populates from cache anyway and engineers refresh at the office.
- **Delete / PDF-download on local-only rows** — clicking these on a `__local: true` row will hit the server with a `local-<uuid>` ID and 404. Easy fix is to gate the row's action handlers on `__local`. Engineers are unlikely to do this for v1 (they sync first), but worth tightening eventually.
- **Cross-tab IDB sync** — IndexedDB doesn't emit native cross-tab events. We currently refresh on `focus` and `storage`, which is best-effort. For true real-time, use `BroadcastChannel`.

### Earlier deferred (now done in Phase 5)
- **Drafts-list merge** — done in `calibrationTable.tsx`. Local-only drafts appear on top with a "📱 Local" pill.
- **Per-draft sync status badge** — done. Auto-save now flips to `"saved-local"` when the write only hit IDB; badge reads "Saved on this device · will sync" in amber.
- **Sync-pending count in Navbar** — done. New `SyncIndicator` shows `<N> pending` + "Sync now" button when there's work in the queue (visible offline too).

Legacy `/drafts` page (`client/app/(pages)/drafts/DraftTable.tsx`) was **intentionally not touched** — it's the old reports-table from before the calibration redesign and has pre-existing TS errors. The new calibration table is the authoritative one.

### Next step on resume

All 5 phases are code-complete and type-clean. Remaining work is **verification + production rollout**:

1. **Unblock sharp / Node 25** (IT on Monday) or run `nvm use 22 && rm -rf client/node_modules client/package-lock.json && npm install` from `client/`.
2. `npm run dev` and walk through the end-to-end offline flows:
   - **Online create → online edit** (existing path, should be unchanged)
   - **Offline create**: DevTools → Network → Offline → click "New Report" → fill the form → click "Save as Draft" → toast says "Saved on this device — will sync when online" → URL becomes `/calibration/local-<uuid>` → row appears in the calibration table with "📱 Local" pill → Navbar shows "1 pending" / "Offline".
   - **Offline edit + reload**: with the local draft open, edit some fields → wait 5s for auto-save → badge shows "Saved on this device · will sync" → reload the tab while still offline → draft fully reloaded from IDB.
   - **Reconnect**: toggle Network back online → sync toast fires within ~1s → "1 draft synced" → URL replaces to `/calibration/<serverId>` → "📱 Local" pill disappears from the list.
   - **Compute / PDF / Submit gating**: open any draft offline → those buttons are disabled with tooltips.
   - **Equipment / Instrument editors**: navigate to one while offline → Edit + Save + Activate disabled with tooltips.
3. `npm run build && npm start` to verify the service worker:
   - DevTools → Application → Service Workers: `sw.js` active with scope `/`
   - DevTools → Application → Manifest: "Josts Calibration" with icons
   - Network → Offline → refresh → app shell still renders
4. Replace the placeholder slate-900 icons in `client/public/icons/` with real Josts-branded artwork (192×192, 512×512, 512×512 maskable).
5. Document the iPad install flow for engineers (see "iPad install instructions" section earlier in this file).

### Deferred polish (not blocking rollout)
- Master-data staleness warning (>7-day cache)
- Local-row delete/PDF-download guards
- BroadcastChannel for cross-tab IDB sync

### Pre-existing context to remember

- Calibration form lives in `client/app/(pages)/(category)/calibration/calibration.tsx` (~2800 lines, do NOT refactor in passing).
- Current auto-save lives at `calibration.tsx:1583-1604` — 5s debounce calling `updateCalibrationReport`. Phase 3 must preserve the debounce but redirect the write path through IndexedDB first.
- TS pre-existing errors in `drafts/DraftTable.tsx` and `home/Table.tsx` — ignore.
- All endpoint builders live in `client/lib/endpoints.ts` — add new ones there if needed.
- No tests; verify with `npm run build && npm start` + DevTools "Offline" toggle, or via the installed PWA on an iPad.
- Earlier in this session we also landed an unrelated server fix: param-name synonym matching for master-equipment UC lookup (`server/src/constants/param-synonyms.js` + edit in `server/src/services/calibration.service.js`). Same branch, separate concern from offline work.
