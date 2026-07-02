# Client (Next.js App Router)

Next.js 15 + React 19 + TypeScript + Tailwind + TanStack Query + axios.
Dev: `npm run dev` (port 3000). Type-check: `npx tsc --noEmit`.

## Layout

- `app/(pages)/(category)/` — route groups for the main UI
  - `calibration/` — calibration report form (`calibration.tsx` ~2800 lines, plus `constants.ts`, `utils.ts`)
  - `equipments/` — Traceability Master Index (reference standards used to calibrate)
  - `instruments/` — DUC instrument master (Fluke/SVERKER/Motwane presets, editable detail page at `[instrumentId]/page.tsx`)
  - `home/`, `drafts/` — report listings
- `app/hooks/query/` — `useGet*` TanStack Query fetchers
- `app/hooks/mutate/` — TanStack Query mutations (separate folder from queries)
- `app/hooks/index.ts` — re-exports the calibration-related hooks
- `lib/endpoints.ts` — centralised API endpoint builders; **all new endpoints go here**, prefixed `EP_`
- `lib/api-client.ts` — `authClient` axios instance with JWT
- `types/calibration.ts` — canonical domain types (`Instrument`, `Parameter`, `ReportMeta`, etc.) — used by the form, not the DUC-master `Instrument` model
- `components/ui/` — shadcn-style primitives (Button, Input, Select, Dialog, Tooltip, Badge, Label)
- `components/Navbar.tsx` — top nav; add new top-level routes to `NAV_LINKS`

## Conventions

- Endpoint factories: `export const EP_FOO = () => "/foo" as const;` with JSDoc above
- Hooks: named export + query-key constant exported alongside (e.g. `INSTRUMENTS_KEY`)
- Mutations invalidate every relevant query key in `onSuccess` (e.g. instrument update invalidates list + detail + history)
- TS is strict; pre-existing errors exist in `drafts/DraftTable.tsx` and `home/Table.tsx` — ignore them when type-checking
- Tailwind utility-first; keep custom classes minimal; for status badges follow the patterns in `EquipmentTable.tsx`
- No comments unless WHY is non-obvious

## DUC Instrument Presets (important)

Hardcoded constants used to live in `calibration/constants.ts` as `INSTRUMENT_PRESETS` + `MAKE_TO_INSTRUMENT_KEY`. **They are gone.** The form now fetches from the DB:

```
GET /instruments
  → useGetInstruments (query/useGetInstruments.tsx)
  → useInstrumentPresets (query/useInstrumentPresets.tsx)
     reshapes API → { presets, makeKeyMap }
  → calibration.tsx passes both into makeParam(), mapApiToInstruments(), AddParamDialog
```

- `makeKeyMap` is keyed by **make only** (e.g. "Fluke" → "Fluke 8846A"). Multiple instruments per make would collide — not yet fixed.
- "✓ Preset params loaded" / "No params found" message under Make dropdown comes from `hasPreset` prop on `MetaGrid` → `SelectField`.
- After editing an instrument in `/instruments/[id]`, presets refresh automatically via React Query cache invalidation.

## Instrument Editor (`instruments/[instrumentId]/page.tsx`)

Fully editable:
- Top fields: `key`, `make`, `modelType`
- Activate/Deactivate (PATCH `/instruments/:id/active`)
- Per-parameter: name + unit + add/remove ranges (label + 5 calc constants)
- Per-range collapsible sample-readings editor (nominal + 5 readings)
- History panel: GET `/instruments/:id/history`
- Save = PUT `/instruments/:id` with full draft body

## Equipment Editor (`equipments/[equipmentId]/page.tsx`)

Same pattern as the instrument editor but for reference-standard masters:
- **View mode** by default — preserves the original styled cards (Identity + Calibration Details + Parameters table)
- **Edit** toggle in the top bar swaps fields/cells to inputs (`Field`, `DateField`, table cells become `Input`s)
- **Save / Cancel** with dirty detection
- **Activate / Deactivate** button always available
- **History** panel at the bottom — `useGetEquipmentHistory(id)`
- Mutations: `useUpdateEquipment`, `useSetEquipmentActive` in `hooks/mutate/useUpdateEquipment.tsx`
- Table rows on `/equipments` are clickable (whole `<tr>` → `router.push("/equipments/:id")`)
- UC column renders `uncertaintyPct` only — absolute uncertainties are converted at import time

## Calibration Form Notes

- Validation: `formErrors` state is populated on submit/compute. Header badge ("N required fields missing") uses `formErrors.length` when present, else falls back to a CSR+Nomenclature heuristic.
- `makeParam(name, unit, instrumentKey, loadExamples, presets)` — must always pass `presets` from `useInstrumentPresets`; same for `mapApiToInstruments(report, presets)`.
- `AddParamDialog` takes `presets` prop directly — don't try to read constants.

## Pre-existing Type Errors (ignore)

- `app/(pages)/drafts/DraftTable.tsx`
- `app/(pages)/home/Table.tsx`

## Tests

**None.** No test runner, no spec files. Verify visually in the browser via `npm run dev` and rely on `npx tsc --noEmit` for type safety.

## TODOs / Known issues (consolidated)

- **DUC presets — make-only lookup** — `useInstrumentPresets.makeKeyMap` is keyed by `make` alone. If two instruments share a make (e.g. multiple Flukes), only the last iterated wins; the Model dropdown is ignored. Switch to a `make+modelType` composite key when adding a second instrument per make.
- **`MAKE_TO_INSTRUMENT_KEY` removed** — the calibration form used to import this from `constants.ts`; it's now derived from API data via `useInstrumentPresets`. Don't reintroduce hardcoded mappings.
- **Calibration form size** — `calibration/calibration.tsx` is ~2800 lines. Resist the urge to "tidy" it in passing; large diffs there are risky. Extract only with clear motivation.
- **No optimistic updates** — mutations rely on query invalidation in `onSuccess`. Fine for low-traffic admin pages; if a list ever needs snappier feedback, add `onMutate` cache writes.
