/**
 * @file seedParameters.js
 * @description Seeds the Parameter collection from the hardcoded INSTRUMENT_CONSTANTS
 * in instrument-specs.js. Parameters are keyed by parameterName (unique). Ranges from
 * multiple instruments are merged — if two instruments share the same range label for
 * the same parameter, the first instrument's constants win (Fluke 8846A has priority).
 *
 * Run: node scripts/seedParameters.js   (or `npm run seed:parameters`)
 * Safe to re-run — documents are upserted by parameterName.
 */

import mongoose from "mongoose";
import dotenv   from "dotenv";
import Parameter from "../src/models/Parameter.js";
import {
  INSTRUMENT_CONSTANTS,
  PARAM_TYPES,
} from "../src/constants/instrument-specs.js";

dotenv.config();

// Unit per parameter type (used for display in the Parameter Config UI)
const UNITS = {
  [PARAM_TYPES.DC_VOLTAGE]:            "V",
  [PARAM_TYPES.AC_VOLTAGE_50HZ]:       "V",
  [PARAM_TYPES.AC_VOLTAGE]:            "V",
  [PARAM_TYPES.AUX_DC_VOLTAGE]:        "V",
  [PARAM_TYPES.DC_CURRENT]:            "A",
  [PARAM_TYPES.AC_CURRENT_50HZ]:       "A",
  [PARAM_TYPES.CLAMP_AC_CURRENT_50HZ]: "A",
  [PARAM_TYPES.RESISTANCE]:            "Ω",
};

async function run() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Merge all ranges per parameter name. First instrument encountered wins
  // for any duplicate range label.
  const paramMap = {}; // paramName → { unit, ranges: { label → RangeSpec } }

  for (const [_instrumentKey, paramDefs] of Object.entries(INSTRUMENT_CONSTANTS)) {
    for (const [paramName, rangeSpecs] of Object.entries(paramDefs)) {
      if (!paramMap[paramName]) {
        paramMap[paramName] = { unit: UNITS[paramName] ?? "", ranges: {} };
      }
      for (const spec of rangeSpecs) {
        // Don't overwrite — first instrument (Fluke 8846A) takes priority
        if (!paramMap[paramName].ranges[spec.label]) {
          paramMap[paramName].ranges[spec.label] = spec;
        }
      }
    }
  }

  let upserted = 0;
  for (const [paramName, { unit, ranges }] of Object.entries(paramMap)) {
    const rangeArray = Object.values(ranges).map(
      ({ label, stdUncPct, accPct, accOffset, leastCount, scopePct }) => ({
        label, stdUncPct, accPct, accOffset, leastCount, scopePct,
      })
    );

    await Parameter.findOneAndUpdate(
      { parameterName: paramName },
      { $set: { parameterName: paramName, unit, ranges: rangeArray, isActive: true } },
      { upsert: true, new: true, runValidators: true }
    );

    console.log(`  ✓ ${paramName} (${rangeArray.length} ranges)`);
    upserted++;
  }

  console.log(`\nDone — ${upserted} parameters seeded.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
