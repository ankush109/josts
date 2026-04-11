/**
 * @file server.js
 * @description Application entry point.
 *
 * Boots Express, attaches middleware, mounts routes, and starts listening.
 * Keep this file thin — configuration belongs in config/, business logic
 * in services/, and HTTP handling in controllers/.
 */

import "dotenv/config";
import express from "express";
import cors    from "cors";

import { connectMongo }    from "./config/db.js";
import routes              from "./routes/index.js";
import { requestLogger }   from "./middleware/requestLogger.js";
import { errorHandler }    from "./middleware/errorHandler.js";
import logger              from "./lib/logger.js";

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Restrict to known origins in production. Add more via the ALLOWED_ORIGINS
// environment variable (comma-separated list).

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} is not allowed`));
    },
    credentials: true,
  })
);

// ─── Body parsing ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: "2mb" }));

// ─── Request logging (assigns req.id + req.log) ───────────────────────────────

app.use(requestLogger);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use(routes);

// ─── Global error handler (must be registered last) ──────────────────────────

app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────

async function start() {
  await connectMongo();

  const PORT = Number(process.env.PORT) || 5000;
  app.listen(PORT, () => {
    logger.info("Server running", {
      port:    PORT,
      env:     process.env.NODE_ENV ?? "development",
      origins: ALLOWED_ORIGINS,
    });
  });
}

start();
