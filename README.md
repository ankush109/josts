# Jasper Calibration Suite

Internal web application for **Josts Electric** engineers to create, manage, and certify electrical calibration reports in compliance with ISO/IEC 17025.

## What it does

Engineers select a Device Under Calibration (DUC), record measurements across parameter ranges (DC Voltage, AC Current, Resistance, etc.), and the system automatically computes the full uncertainty budget (Welch-Satterthwaite method) for each measurement. Completed reports are submitted for admin verification and a PDF calibration certificate is generated.

Admins manage the reference standard equipment master and the DUC instrument constants that drive the uncertainty math. Any changes made to instrument constants in the UI immediately affect new calibration computations.

The app works offline — field engineers can create and edit drafts on an iPad at a remote site, and everything syncs automatically when they reconnect.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, TanStack Query |
| Backend | Express 5, Mongoose 9, MongoDB |
| PDF worker | Node.js, Redis queue (BullMQ-style) |
| Offline | PWA (Serwist service worker), IndexedDB via idb-keyval |

## Services

```
client/   Next.js app             → :3000
server/   Express REST API        → :5000
worker/   PDF generation worker   (Redis queue consumer)
```

## Getting started

```bash
# Server
cd server && npm install && npm run dev

# Client
cd client && npm install && npm run dev

# Worker (needs Redis)
cd worker && npm install && node index.js
```

Required env vars: `MONGO_URI` (server), `REDIS_URL` (server + worker).

## Key features

- **Calibration reports** — full create/edit/submit/verify lifecycle with audit trail
- **Uncertainty budget** — automatic computation per measurement using instrument constants stored in the DB
- **Traceability** — each measurement links to a master reference equipment entry; uncertainty is pulled from the equipment's calibration certificate data
- **Equipment & Instrument masters** — admin-editable reference standards and DUC presets with change history
- **PDF certificates** — generated asynchronously via a Redis-backed worker
- **Offline drafts** — create and edit reports without internet; syncs on reconnect
- **Help & Support** — in-app support messaging with admin reply inbox
- **Dashboard** — admin analytics (report volumes, equipment expiry, engineer workload)
