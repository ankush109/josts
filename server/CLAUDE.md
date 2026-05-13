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
- `/instruments` — DUC instrument templates (Fluke 8846A, SVERKER 780, …)
  - `GET /` list, `POST /` create
  - `GET /:id`, `PUT /:id`, `DELETE /:id` (soft delete via `isActive=false`)
  - `PATCH /:id/active` body `{ isActive }`
  - `GET /:id/history` audit log entries

## Domain Models

### `Equipment` (reference standards)
Traceable equipment used to calibrate DUCs. Field `parameters[]` carries actual measured values per range (stdValue, ducReading, errorPct, uncertaintyPct).

### `Instrument` (DUC instrument templates) — `models/Instrument.js`
Master catalog of DUC instruments like "Fluke 8846A". Carries:
- `key` (unique), `make`, `modelType`, `isActive`
- `parameters[]` where each has `parameterName`, `unit`, `ranges[]`, `samples[][]`
- `ranges[i]` = `{ label, stdUncPct, accPct, accOffset, leastCount, scopePct }` — **these are the calibration constants used by the uncertainty-budget math**
- `samples[i]` = array of `{ nominal, readings[5] }` points used by the form's "Load examples" feature

### `CalibrationReport` (in `calibration.routes.js` controller)
The actual calibration job for one DUC.

### `AuditLog` (for reports) and `InstrumentAuditLog` (for instruments)
Field-level diffs `{ field, from, to }` + `action` enum + `performedBy`.

## Critical Duplication (READ THIS)

The DUC calibration constants currently live in **two places**:

1. `src/constants/instrument-specs.js` — `INSTRUMENT_CONSTANTS` lookup
2. MongoDB `instruments` collection (seeded from #1 via `scripts/seedInstruments.js`)

The calibration **compute path** (`services/calibration.service.js` → `getInstrumentLookup`) still imports from `instrument-specs.js`. The admin UI edits the DB. **So editing constants via the UI does not yet affect calibration math.** Migrating `getInstrumentLookup` to read from `Instrument` collection is a pending TODO.

The seed script is upsert-by-`key` and safe to re-run. Run `npm run seed:instruments` after editing `instrument-specs.js`.

## Instrument Audit Logging

`services/instrument-audit.service.js`:
- `computeInstrumentDiff(oldDoc, newDoc)` — emits change rows for top-level fields, parameter add/remove, range-by-range field changes, and a summarised "samples updated" row
- `logInstrumentAudit({ instrumentId, action, performedBy, changes })`
- `getInstrumentAudit(instrumentId)` — sorted newest first, populates user

`services/instrument.service.js` wraps `updateInstrument` to diff + log automatically. `setInstrumentActive` and `deleteInstrument` both funnel through `updateInstrument`, so toggling status logs `activated`/`deactivated`.

## Conventions

- Controllers stay thin — never query in a controller; call a service
- Services throw `Error` with `err.statusCode` set when meaningful; `errorHandler.js` maps these
- Use `mongoose.Types.ObjectId.isValid()` at service entry for any `:id` param
- Soft delete via `isActive: false`, never hard-delete (for both Equipment and Instrument)
- For list endpoints follow the pattern in `equipment.service.js` / `instrument.service.js`: `page`, `limit`, `search`, `status`, `sortBy`

## Calibration Math Reference

In `constants/instrument-specs.js` header comment — formulas for M (std uncertainty), O (accuracy), P (least count), U (scope) components of the uncertainty budget. Same fields are now on `Instrument.parameters[].ranges[]` in the DB.

## Env Vars

`MONGO_URI` required. `.env` loaded by dotenv at entrypoint and in seed script.
