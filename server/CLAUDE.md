# Server (Express + MongoDB)

Express 5 + Mongoose 9 + JWT auth. ESM (`"type": "module"`).
Dev: `npm run dev` (nodemon).
Data scripts:
- `npm run seed:instruments` — DUC presets from `constants/instrument-specs.js`
- `npm run import:equipments -- "/path/to/Calibration_Traceability_Josts_vN.xlsx"` — reference-standard master from the Josts traceability workbook (upserts by `idNo`; rows with `—` for ID No. fall back to `JECL/KOL/SN-<serial>`). Sheet column layouts vary per equipment type; columns are auto-detected by header text.

## Layout

```
src/
  server.js              entrypoint
  config/db.js           mongoose.connect via MONGO_URI
  routes/
    index.js             mounts /api/v1/* groups
    auth.routes.js, user.routes.js,
    calibration.routes.js, report.routes.js,
    equipments.js, instruments.routes.js
  controllers/           thin: parse req, call service, send response
  services/              business logic, all DB access
  models/                Mongoose schemas
  middleware/auth.js     authMiddleware, adminMiddleware
  middleware/errorHandler.js
  constants/             static lookup tables (see notes below)
  utils/                 calibration-compute, jwt, unit-normalize, etc.
  lib/logger.js          structured logger
scripts/
  seedInstruments.js     populates Instrument master from instrument-specs.js
```

## API surface (under `/api/v1`)

- `/auth`, `/user`
- `/calibration-report` — calibration reports CRUD + compute + audit history
- `/report` — legacy reports
- `/equipments` — reference-standard master (different domain from `/instruments`)
  - `GET /`, `GET /params-summary`
  - `GET /:id`, `PUT /:id`, `DELETE /:id` (soft via `isActive=false`)
  - `PATCH /:id/active` body `{ isActive }`
  - `GET /:id/history` audit log
- `/instruments` — DUC instrument templates (Fluke 8846A, SVERKER 780, …)
  - `GET /` list, `POST /` create
  - `GET /:id`, `PUT /:id`, `DELETE /:id` (soft delete via `isActive=false`)
  - `PATCH /:id/active` body `{ isActive }`
  - `GET /:id/history` audit log entries

## Domain Models

### `Equipment` (reference standards)
Traceable equipment used to calibrate DUCs. Field `parameters[]` carries actual measured values per range:
- `parameterName, range, subRange, stdValue, ducReading, unit, errorPct, uncertaintyPct, remarks`
- Top-level: `equipmentName, make, model, serialNo, idNo (unique upsert key), certificateNo, calLab, calDate, nextDue, nablCert, nominalRatio, isActive`
- **Only `uncertaintyPct` is stored** — the importer converts absolute uncertainty cells (e.g. Keysight "0.00057 mV") to % via SI-normalised `(abs / |stdValue|) × 100`.

### `Instrument` (DUC instrument templates) — `models/Instrument.js`
Master catalog of DUC instruments like "Fluke 8846A". Carries:
- `key` (unique), `make`, `modelType`, `isActive`
- `parameters[]` where each has `parameterName`, `unit`, `ranges[]`, `samples[][]`
- `ranges[i]` = `{ label, stdUncPct, accPct, accOffset, leastCount, scopePct }` — **these are the calibration constants used by the uncertainty-budget math**
- `samples[i]` = array of `{ nominal, readings[5] }` points used by the form's "Load examples" feature

### `CalibrationReport` (in `calibration.routes.js` controller)
The actual calibration job for one DUC.

### `AuditLog` (for reports), `InstrumentAuditLog`, `EquipmentAuditLog`
All three share the shape: `{ entityRef, action, performedBy, changes: [{ field, from, to }], timestamps }`.
- Report actions: `created | updated | status_changed | deleted`
- Instrument/Equipment actions: `created | updated | activated | deactivated | deleted`

## Critical Duplication (READ THIS)

The DUC calibration constants currently live in **two places**:

1. `src/constants/instrument-specs.js` — `INSTRUMENT_CONSTANTS` lookup
2. MongoDB `instruments` collection (seeded from #1 via `scripts/seedInstruments.js`)

The calibration **compute path** (`services/calibration.service.js` → `getInstrumentLookup`) still imports from `instrument-specs.js`. The admin UI edits the DB. **So editing constants via the UI does not yet affect calibration math.** Migrating `getInstrumentLookup` to read from `Instrument` collection is a pending TODO.

The seed script is upsert-by-`key` and safe to re-run. Run `npm run seed:instruments` after editing `instrument-specs.js`.

## Audit Logging Pattern (Instrument + Equipment — same shape)

Both follow the identical pattern:
- `services/<entity>-audit.service.js` exports `compute<Entity>Diff(old, new)`, `log<Entity>Audit(...)`, `get<Entity>Audit(id)`
- `services/<entity>.service.js` wraps `update<Entity>` to diff + log automatically
- `setActive` and `delete` funnel through `update<Entity>`, so toggling status logs `activated` / `deactivated`
- Diff emits per-field rows + per-row parameter changes (`Row N · stdValue`, etc.); parameter add/remove emits a single summary row
- History endpoint returns newest-first with `performedBy` populated

When adding audit to another entity, copy `instrument-audit.service.js` and adapt `TOP_FIELDS` / row diff logic.

## Conventions

- Controllers stay thin — never query in a controller; call a service
- Services throw `Error` with `err.statusCode` set when meaningful; `errorHandler.js` maps these
- Use `mongoose.Types.ObjectId.isValid()` at service entry for any `:id` param
- Soft delete via `isActive: false`, never hard-delete (for both Equipment and Instrument)
- For list endpoints follow the pattern in `equipment.service.js` / `instrument.service.js`: `page`, `limit`, `search`, `status`, `sortBy`

## Calibration Math Reference

In `constants/instrument-specs.js` header comment — formulas for M (std uncertainty), O (accuracy), P (least count), U (scope) components of the uncertainty budget. Same fields are now on `Instrument.parameters[].ranges[]` in the DB.

## Equipment XLSX Importer

`scripts/importEquipments.js` ingests the Josts traceability workbook:
- Reads `Index` tab → one row per equipment with top-level fields
- For each row, opens the same-named sheet and parses parameter rows
- Header columns auto-detected by keyword match (`findCol(headers, "ducreading", …)`) — handles Shunt/TTR/VCM/Fluke/Keysight layouts
- `parseUncertainty` returns either `{ pct }` or `{ abs, absUnit }`; absolute values are converted to % using `toSI(abs, absUnit) / |toSI(stdValue, unit)| × 100`
- Upserts by `idNo`; missing IDs fall back to `JECL/KOL/SN-<serial>`
- Samgor's multi-value cells (`"100.109 pF | 0.00001"`) leave `stdValue` null — that's expected; future enhancement could split them.

**Caveat:** Excel parameter names (e.g. "DC High Current", "AC High Voltage @ 50 Hz") do NOT match the DUC form's parameter names ("DC Current", "AC Voltage @50Hz"). `lookupMasterUncertainty` in `calibration.service.js` won't find matches without a normalisation/synonym map — pending TODO.

## Env Vars

`MONGO_URI` required. `.env` loaded by dotenv at entrypoint and in seed script.

## Tests

**None.** No test runner, no spec files, no CI test step. Don't waste time looking. Verify changes by running the dev server + hitting endpoints manually, or via the importer/seed scripts.

## TODOs / Known issues (consolidated)

- **DUC constants duplication** — `instrument-specs.js` (constants file) and the `instruments` collection both hold the calc constants. The compute path (`calibration.service.js → getInstrumentLookup`) still reads the file, so admin-UI edits don't affect calibration math yet. Migrate `getInstrumentLookup` to read from `Instrument` to make the DB authoritative.
- **Excel param-name mismatch** — imported equipments use names like "DC High Current", "AC High Voltage @ 50 Hz", "Ratio @ 80V 50Hz"; the form sends "DC Current", "AC Voltage @50Hz", etc. `lookupMasterUncertainty` does case/whitespace-insensitive exact match, so most ref-equipment lookups currently miss. Build a synonym map (or normalise at import time).
- **Make-only DUC preset lookup** — `useInstrumentPresets.makeKeyMap` is keyed by `make` alone. Multiple instruments per make in the DB will collide. Switch to `make+modelType` when needed.
- **Samgor-style multi-value cells** — importer leaves `stdValue` null when the cell holds two values separated by `|`. Either split into two parameter rows or store them in `remarks`.
- **Stale Equipment docs** — the DB has 30 equipments but the Excel only provides 27. The importer doesn't prune; consider a `--prune` flag that deactivates docs whose `idNo` isn't in the workbook.
- **`Equipment.nominalRatio`** — the equipment editor sends this field; it IS in the schema (`models/Equipment.js`) but it's not populated by the XLSX importer (the Index tab has no such column). Safe to ignore unless someone wants to back-fill.
