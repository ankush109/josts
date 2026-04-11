# Server Architecture (post-refactor)

Root: `server/src/`
Entry: `server/src/server.js`
The old `server/src/v1/`, `server/src/db/`, and `server/src/utils/` folders are **dead code** — nothing imports them anymore. Safe to delete.

---

## Folder Map

```
src/
├── config/
│   └── db.js                  connectMongo() — Mongoose with serverSelectionTimeoutMS/socketTimeoutMS
├── lib/
│   ├── logger.js              Structured JSON logger. debug/info/warn/error. Reads LOG_LEVEL env.
│   ├── jwt.js                 signToken(payload) / verifyToken(token). Reads JWT_SECRET env.
│   ├── s3.js                  s3Client + getSignedDownloadUrl(key) — 1hr pre-signed GET URLs
│   └── redis.js               Redis client (REDIS_HOST/REDIS_PORT env) + pushPdfJobToRedis({reportId, action, type})
├── middleware/
│   ├── auth.js                authMiddleware (Bearer JWT → req.user) + adminMiddleware (role check)
│   ├── errorHandler.js        Global Express error handler — handles Mongoose 11000/ValidationError, JWT errors, custom statusCode
│   └── validate.js            validate(zodSchema) → middleware factory, replaces req.body with parsed output
├── models/
│   ├── User.js                Fields: name, email (index+regex), signatureName, location, role, password(select:false). Indexes: email, role.
│   ├── Calibration.js         CalibrationReport. Sub-schemas: computed→measurement→range→parameter→instrument→signatures. Indexes: createdBy+createdAt, status+createdAt, text search.
│   └── Report.js              Generic report. approvalSchema sub-doc (fixed — was broken). Fields: title, content, status, filePath, approval, payload, reportedBy. Indexes: reportedBy+createdAt, status.
├── schemas/                   Zod validation schemas (used via validate() middleware)
│   ├── auth.schema.js         registerSchema (email @josts.com, password min 8) + loginSchema
│   ├── user.schema.js         updateProfileSchema (name/signatureName/location optional) + resetPasswordSchema
│   └── calibration.schema.js  createCalibrationSchema + computePreviewSchema + verifyRejectSchema
├── services/                  ALL business logic. No req/res here.
│   ├── auth.service.js        registerUser({email,password}) → {token} | loginUser({email,password}) → {token, user}. Timing-safe login. SALT_ROUNDS=12.
│   ├── user.service.js        getProfile(userId) | updateProfile(userId, updates) | resetPassword(userId, old, new). bcrypt fixed (was missing import).
│   ├── calibration.service.js injectComputed(instruments[]) — walks tree, calls computeUncertaintyBudget per measurement. generateCertNo(userId, customerName) → "JK/DDMMYY/C/ENG/001". createReport / listReports / getReportById / updateReport / verifyOrReject / previewCompute / deleteReport.
│   └── report.service.js      upsertReport (create or edit, action="edit" fixed) | getReportsForUser (populate, no N+1) | getReportById | getMyDrafts | deleteReport | changeApprovalStatus (admin only, validated) | getReportSignedUrl (calibration multi-page or single).
├── controllers/               Thin wrappers: parse req → call service → res.json / next(err)
│   ├── auth.controller.js     register, login
│   ├── user.controller.js     getProfile, updateProfile, resetPassword
│   ├── calibration.controller.js  createReport, listReports, getReport, updateReport, verifyOrReject, computePreview, deleteReport
│   └── report.controller.js   upsertReport, listReports, getReportUrl, getReport, getMyDrafts, deleteReport, changeStatus
├── routes/
│   ├── index.js               GET /health + mounts: /auth /user /calibration-report /report
│   ├── auth.routes.js         POST /auth/register (validate) | POST /auth/login (validate)
│   ├── user.routes.js         GET /user/profile | PUT /user/profile (validate) | PUT /user/password (validate)
│   ├── calibration.routes.js  POST /compute (before /:id!) | POST / | GET / | GET /:id | PUT /:id | PATCH /:id/status (admin) | DELETE /:id
│   └── report.routes.js       Static paths first (/drafts, /url/:id) then dynamic. PUT /:id/:status behind adminMiddleware
├── constants/
│   └── instrument-specs.js    PARAM_TYPES enum + INSTRUMENT_CONSTANTS (Fluke 8846A, SVERKER 780) + getInstrumentLookup(instrumentName)
├── utils/
│   └── calibration-compute.js computeUncertaintyBudget({nomValue, readings, stdUncPct, accPct, accOffset, leastCount, scopePct}) → BudgetResult. Variables J-W match spreadsheet. tinv() table DoF 1-30, k=2.0 for >30.
└── server.js                  CORS from ALLOWED_ORIGINS env (default localhost:3000). express.json limit 2mb. Structured request logging. Routes. errorHandler last.
```

---

## Key Env Vars

| Var | Used in |
|-----|---------|
| `MONGO_URI` | `config/db.js` |
| `JWT_SECRET` | `lib/jwt.js` |
| `REDIS_HOST` / `REDIS_PORT` | `lib/redis.js` |
| `AWS_REGION` / `ACCESS_KEY` / `AWS_SECRET_KEY` / `AWS_S3_BUCKET` | `lib/s3.js` |
| `ALLOWED_ORIGINS` | `server.js` (comma-separated) |
| `LOG_LEVEL` | `lib/logger.js` (debug/info/warn/error) |
| `PORT` | `server.js` (default 5000) |

---

## Bugs Fixed in Refactor

| Bug | Where | Fix |
|-----|-------|-----|
| Missing `bcrypt` import | user controller | Added to `user.service.js` |
| `changeReportStatus` had no auth check | report controller | Behind `adminMiddleware` in routes |
| `resetPassword` not wired to any route | user routes | Added `PUT /user/password` |
| N+1 query in `getReportsForUser` | report controller | `populate("reportedBy")` |
| `action = "create"` on edits | report controller | Fixed to `"edit"` in service |
| `report.id` instead of `report._id` | report controller | Fixed in Redis push |
| Broken `approvalStatus` sub-doc in Report schema | Report model | Extracted to `approvalSchema` |
| Duplicate timestamps in Report schema | Report model | Removed manual `createdAt`/`updatedAt` |
| Redis host hardcoded `127.0.0.1` | `func-utils.js` | Reads `REDIS_HOST`/`REDIS_PORT` env |
| `CORS origin: "*"` | `server.js` | Restricted to `ALLOWED_ORIGINS` env |
| 30+ `console.log` scattered everywhere | all files | Replaced with `logger` |

---

## Data Flow: Calibration PDF

1. `POST /calibration-report` → `createReport()` in service
2. `injectComputed()` walks instruments → calls `computeUncertaintyBudget()` per measurement
3. Report saved to MongoDB
4. If `status !== "draft"` → `pushPdfJobToRedis({ reportId, action: "create", type: "calibration" })`
5. Worker picks up job → generates PDF → uploads to S3 → updates `report.filePaths[]`
6. Client calls `GET /report/url/:id?type=calibration` → `getSignedDownloadUrl()` per filePath

## Data Flow: Auth

1. `POST /auth/register` → `validate(registerSchema)` → `registerUser()` → bcrypt hash → `User.create` → `signToken` → `{ token }`
2. `POST /auth/login` → `validate(loginSchema)` → `loginUser()` → timing-safe `bcrypt.compare` → `signToken` → `{ token, user }`
3. All protected routes → `authMiddleware` → `verifyToken` → `req.user = { userId, userRole }`
4. Admin routes additionally → `adminMiddleware` → checks `req.user.userRole === "admin"`
