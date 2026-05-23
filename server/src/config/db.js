/**
 * @file db.js
 * @description MongoDB connection using Mongoose.
 *
 * Call `connectMongo()` once at application start-up. Mongoose will
 * automatically reuse the connection pool for all subsequent queries.
 */

import mongoose from "mongoose";
import logger   from "../lib/logger.js";
import Parameter from "../models/Parameter.js";
import { INSTRUMENT_CONSTANTS } from "../constants/instrument-specs.js";

/**
 * Opens a connection to MongoDB using the MONGO_URI environment variable.
 * Exits the process on failure — a server without a database is non-functional.
 *
 * @returns {Promise<void>}
 */
const PARAM_UNITS = {
  "DC Voltage": "V", "AC Voltage @50Hz": "V", "AC Voltage": "V", "AUX. DC Voltage": "V",
  "DC Current": "A", "AC Current @50Hz": "A", "Clamp Meter AC Current @50Hz": "A", "Resistance": "Ω",
};

async function seedParametersIfEmpty() {
  try {
    const count = await Parameter.countDocuments();
    if (count > 0) return;

    // Merge ranges per parameter name across all instruments (first seen wins for duplicate labels)
    const paramMap = {};
    for (const paramDefs of Object.values(INSTRUMENT_CONSTANTS)) {
      for (const [paramName, rangeSpecs] of Object.entries(paramDefs)) {
        if (!paramMap[paramName]) paramMap[paramName] = { unit: PARAM_UNITS[paramName] ?? "", ranges: {} };
        for (const spec of rangeSpecs) {
          if (!paramMap[paramName].ranges[spec.label]) paramMap[paramName].ranges[spec.label] = spec;
        }
      }
    }

    const docs = Object.entries(paramMap).map(([parameterName, { unit, ranges }]) => ({
      parameterName,
      unit,
      isActive: true,
      ranges: Object.values(ranges).map(({ label, stdUncPct, accPct, accOffset, leastCount, scopePct }) =>
        ({ label, stdUncPct, accPct, accOffset, leastCount, scopePct })
      ),
    }));

    await Parameter.insertMany(docs, { ordered: false });
    logger.info(`Seeded ${docs.length} parameters from instrument-specs`);
  } catch (err) {
    logger.warn("Parameter seed skipped or partial", { error: err?.message });
  }
}

async function dropStaleIndexes() {
  try {
    const col = mongoose.connection.collection("calibrationreports");
    const indexes = await col.indexes();
    const stale = indexes.find((idx) => idx.key?.csrNo != null);
    if (stale) {
      await col.dropIndex(stale.name);
      logger.info("Dropped stale csrNo unique index from calibrationreports");
    }
  } catch (err) {
    // Non-fatal — log and continue; the index may not exist on fresh DBs
    logger.warn("Could not drop stale csrNo index", { error: err?.message });
  }
}

export async function connectMongo() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS:          45000,
    });
    logger.info("MongoDB connected");
    await dropStaleIndexes();
    await seedParametersIfEmpty();
  } catch (err) {
    logger.error("MongoDB connection failed", err);
    process.exit(1);
  }
}
