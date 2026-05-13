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

## Calibration Form Notes

- Validation: `formErrors` state is populated on submit/compute. Header badge ("N required fields missing") uses `formErrors.length` when present, else falls back to a CSR+Nomenclature heuristic.
- `makeParam(name, unit, instrumentKey, loadExamples, presets)` — must always pass `presets` from `useInstrumentPresets`; same for `mapApiToInstruments(report, presets)`.
- `AddParamDialog` takes `presets` prop directly — don't try to read constants.

## Pre-existing Type Errors (ignore)

- `app/(pages)/drafts/DraftTable.tsx`
- `app/(pages)/home/Table.tsx`
