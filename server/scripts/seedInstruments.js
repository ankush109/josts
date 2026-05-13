/**
 * @file seedInstruments.js
 * @description Seeds the Instrument master collection by combining:
 *   - calibration constants from src/constants/instrument-specs.js
 *     (stdUncPct, accPct, accOffset, leastCount, scopePct per range — used by
 *     the uncertainty-budget math)
 *   - sample readings used by the calibration form's "load examples" presets
 *
 * Run with: node scripts/seedInstruments.js   (or `npm run seed:instruments`)
 *
 * Documents are upserted by `key`, so re-running is safe.
 */

import mongoose from "mongoose";
import dotenv   from "dotenv";
import Instrument from "../src/models/Instrument.js";
import {
  INSTRUMENT_CONSTANTS,
  MAKE_TO_INSTRUMENT_KEY,
  PARAM_TYPES,
} from "../src/constants/instrument-specs.js";

dotenv.config();

// ── Make → modelType (derive from key by stripping leading "<Make> ") ───────
const KEY_META = Object.fromEntries(
  Object.entries(MAKE_TO_INSTRUMENT_KEY).map(([make, key]) => [
    key,
    { make, modelType: key.replace(`${make} `, "").trim() },
  ])
);

// ── Sample readings (per instrument key → param name → range label → points)
const toPoints = (rows) =>
  rows.map(([nominal, readings]) => ({ nominal, readings }));

const SAMPLES = {
  "Fluke 8846A": {
    [PARAM_TYPES.AC_VOLTAGE_50HZ]: {
      "4V/0.001":   toPoints([["0.5", ["0.497","0.498","0.499","0.496","0.495"]], ["3.5", ["3.494","3.497","3.493","3.493","3.493"]]]),
      "40V/0.01":   toPoints([["5",   ["4.97","4.98","4.99","4.94","4.97"]],      ["35",  ["34.95","34.96","34.97","34.94","34.93"]]]),
      "400V/0.1":   toPoints([["50",  ["49.9","50.0","49.8","49.6","49.9"]],      ["350", ["349.8","349.9","349.7","349.7","349.6"]]]),
      "1000V/1":    toPoints([["500", ["498","499","498","497","498"]],           ["950", ["947","948","948","946","946"]]]),
    },
    [PARAM_TYPES.DC_VOLTAGE]: {
      "400mV/0.1":  toPoints([["0.1", ["0.0997","0.0998","0.0996","0.0997","0.0995"]], ["0.35", ["0.3496","0.3497","0.3494","0.3495","0.3493"]]]),
      "4V/0.001":   toPoints([["0.5", ["0.497","0.498","0.499","0.496","0.497"]],      ["3.5",  ["3.494","3.497","3.493","3.494","3.493"]]]),
      "40V/0.01":   toPoints([["5",   ["4.97","4.98","4.99","4.94","4.97"]],           ["35",   ["34.95","34.96","34.97","34.94","34.93"]]]),
      "400V/0.1":   toPoints([["50",  ["49.9","50.0","49.8","49.6","49.9"]],           ["350",  ["349.8","349.9","349.7","349.7","349.6"]]]),
      "1000V/1":    toPoints([["500", ["498","499","498","497","498"]],                ["950",  ["947","948","948","946","946"]]]),
    },
    [PARAM_TYPES.AC_CURRENT_50HZ]: {
      "40mA/0.01":  toPoints([["20",  ["19.97","19.98","19.96","19.97","19.95"]], ["35",  ["34.95","34.96","34.94","34.95","34.93"]]]),
      "400mA/0.1":  toPoints([["200", ["199.8","199.9","199.7","199.8","199.6"]], ["350", ["349.8","349.9","349.7","349.8","349.6"]]]),
      "4A/0.001":   toPoints([["2",   ["1.997","1.998","1.996","1.997","1.995"]], ["3.5", ["3.495","3.496","3.494","3.495","3.493"]]]),
      "10A/0.01":   toPoints([["5",   ["4.97","4.98","4.96","4.97","4.95"]],      ["9",   ["8.97","8.98","8.96","8.97","8.95"]]]),
    },
    [PARAM_TYPES.DC_CURRENT]: {
      "40mA/0.01":  toPoints([["20",  ["19.97","19.98","19.96","19.97","19.95"]], ["35",  ["34.95","34.96","34.94","34.95","34.93"]]]),
      "400mA/0.1":  toPoints([["200", ["199.8","199.9","199.7","199.8","199.6"]], ["350", ["349.8","349.9","349.7","349.8","349.6"]]]),
      "4A/0.001":   toPoints([["2",   ["1.997","1.998","1.996","1.997","1.995"]], ["3.5", ["3.495","3.496","3.494","3.495","3.493"]]]),
      "10A/0.01":   toPoints([["5",   ["4.97","4.98","4.96","4.97","4.95"]],      ["9",   ["8.97","8.98","8.96","8.97","8.95"]]]),
    },
    [PARAM_TYPES.RESISTANCE]: {
      "400Ω/0.1":   toPoints([["100", ["99.9","100.0","99.8","99.9","99.7"]],     ["350", ["349.8","349.9","349.7","349.8","349.6"]]]),
      "4KΩ/0.001":  toPoints([["1",   ["0.999","1.000","0.998","0.999","0.997"]], ["3.5", ["3.496","3.497","3.495","3.496","3.494"]]]),
      "40KΩ/0.01":  toPoints([["10",  ["9.97","9.98","9.96","9.97","9.95"]],      ["35",  ["34.93","34.94","34.92","34.93","34.91"]]]),
      "400KΩ/0.1":  toPoints([["100", ["99.8","99.9","99.7","99.8","99.6"]],      ["350", ["349.6","349.7","349.5","349.6","349.4"]]]),
    },
  },
  "SVERKER 780": {
    [PARAM_TYPES.AC_CURRENT_50HZ]: {
      "40A/0.01":  toPoints([["30", ["29.98","30.28","30.18","29.58","29.88"]]]),
      "100A/0.01": toPoints([
        ["50",  ["49.93","50.03","49.83","49.93","49.93"]],
        ["60",  ["59.91","60.01","60.11","60.01","59.51"]],
        ["80",  ["79.88","80.28","d","79.38","79.78"]],
        ["100", ["99.79","100.19","99.59","99.59","99.79"]],
      ]),
    },
    [PARAM_TYPES.AC_VOLTAGE]: {
      "60V/1":  toPoints([["30", ["29.997","30.297","30.197","29.597","29.897"]]]),
      "600V/1": toPoints([
        ["100", ["99.96","100.06","99.86","99.96","99.96"]],
        ["300", ["299.93","300.03","300.13","300.03","299.53"]],
        ["450", ["449.91","453.91","451.91","444.91","448.91"]],
        ["600", ["599.8","603.8","597.8","597.8","599.8"]],
      ]),
    },
    [PARAM_TYPES.AUX_DC_VOLTAGE]: {
      "130V/1": toPoints([
        ["30",  ["29.998","30.298","30.198","29.598","29.898"]],
        ["100", ["99.97","100.07","99.87","99.97","99.97"]],
      ]),
      "220V/1": toPoints([
        ["150", ["149.96","150.06","150.16","150.06","149.56"]],
        ["200", ["199.96","203.96","201.96","194.96","198.96"]],
        ["220", ["219.93","223.93","217.93","217.93","219.93"]],
      ]),
    },
    [PARAM_TYPES.RESISTANCE]: {
      "10Ω/1":       toPoints([
        ["0.5", ["0.49","0.52","0.51","0.45","0.48"]],
        ["1",   ["0.99","1.00","0.98","0.99","0.99"]],
      ]),
      "100Ω/1":      toPoints([
        ["25",  ["24.98","25.02","25.00","24.93","24.97"]],
        ["100", ["99.98","100.02","99.96","99.96","99.98"]],
      ]),
      "1000Ω/1":     toPoints([["500", ["499.95","499.99","499.97","499.90","499.94"]]]),
      "2.5kΩ/0.001": toPoints([
        ["1", ["0.9997","1.0001","0.9999","0.9992","0.9996"]],
        ["3", ["2.4994","2.4998","2.4996","2.4989","2.4993"]],
      ]),
    },
  },
};

// ── Unit per parameter type (best-effort; can be tweaked per instrument) ────
const UNITS_PER_PARAM = {
  [PARAM_TYPES.DC_VOLTAGE]:            "V",
  [PARAM_TYPES.AC_VOLTAGE_50HZ]:       "V",
  [PARAM_TYPES.AC_VOLTAGE]:            "V",
  [PARAM_TYPES.AUX_DC_VOLTAGE]:        "V",
  [PARAM_TYPES.DC_CURRENT]:            "mA",
  [PARAM_TYPES.AC_CURRENT_50HZ]:       "A",
  [PARAM_TYPES.CLAMP_AC_CURRENT_50HZ]: "A",
  [PARAM_TYPES.RESISTANCE]:            "Ω",
};

// Per-instrument overrides where defaults don't match (e.g. Fluke uses mA for AC)
const UNIT_OVERRIDES = {
  "Fluke 8846A": {
    [PARAM_TYPES.AC_CURRENT_50HZ]: "mA",
  },
};

function unitFor(instrumentKey, paramName) {
  return UNIT_OVERRIDES[instrumentKey]?.[paramName] ?? UNITS_PER_PARAM[paramName] ?? "";
}

function buildInstrumentDoc(key) {
  const meta = KEY_META[key];
  const params = INSTRUMENT_CONSTANTS[key];
  if (!meta || !params) return null;

  const parameters = Object.entries(params).map(([paramName, rangeSpecs]) => {
    const sampleMap = SAMPLES[key]?.[paramName] ?? {};
    return {
      parameterName: paramName,
      unit:          unitFor(key, paramName),
      ranges:        rangeSpecs.map(({ label, stdUncPct, accPct, accOffset, leastCount, scopePct }) => ({
        label, stdUncPct, accPct, accOffset, leastCount, scopePct,
      })),
      samples:       rangeSpecs.map((r) => sampleMap[r.label] ?? []),
    };
  });

  return { key, make: meta.make, modelType: meta.modelType, parameters };
}

async function run() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  for (const key of Object.keys(INSTRUMENT_CONSTANTS)) {
    const doc = buildInstrumentDoc(key);
    if (!doc) {
      console.warn(`Skipping ${key}: no make mapping in MAKE_TO_INSTRUMENT_KEY`);
      continue;
    }
    const res = await Instrument.findOneAndUpdate(
      { key: doc.key },
      { $set: doc },
      { upsert: true, new: true }
    );
    console.log(`Upserted ${res.key} (${res.parameters.length} parameters)`);
  }

  await mongoose.disconnect();
  console.log("Done");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
