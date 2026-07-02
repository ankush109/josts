/**
 * Test calibration uncertainty budget computation.
 *
 * Calls previewCompute() directly (no DB write, no HTTP auth) using:
 *  - DUC:   simulated Fluke 87V DMM (customer's instrument)
 *  - Ref:   Fluke 8846A (JECL/KOL/DMM-01, _id: 69ebd2958975d9ec1ceb5347)
 *
 * Run:  node scripts/testCalcBudget.js
 */

import mongoose from "mongoose";
import dotenv   from "dotenv";
import path     from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ─── connect first so Equipment.find() works inside previewCompute ────────────
await mongoose.connect(process.env.MONGO_URI);

import { previewCompute } from "../src/services/calibration.service.js";

// ─── Test instrument payload ──────────────────────────────────────────────────
const FLUKE_8846A_ID = "69ebd2958975d9ec1ceb5347"; // Fluke 8846A reference standard

const instrument = {
  nomenclature:        "Digital Multimeter",
  make:                "Fluke",
  modelType:           "87V",
  slNo:                "TEST-DMM-001",
  idNo:                "TEST/DUC/001",
  calibrationMethod:   "Comparison Method",
  refStandards:        [{ equipmentId: FLUKE_8846A_ID }],
  parameters: [
    {
      name: "DC Voltage",
      unit: "mV",
      ranges: [
        {
          label: "100 mV range",
          measurements: [
            {
              nomValue:  1,
              nomUnit:   "mV",
              readings:  [0.9991, 0.9992, 0.9993, 0.9991, 0.9992],
            },
            {
              nomValue:  10,
              nomUnit:   "mV",
              readings:  [9.9988, 9.9989, 9.9990, 9.9988, 9.9989],
            },
            {
              nomValue:  50,
              nomUnit:   "mV",
              readings:  [49.9985, 49.9986, 49.9987, 49.9985, 49.9986],
            },
          ],
        },
      ],
    },
    {
      name: "DC Voltage",
      unit: "V",
      ranges: [
        {
          label: "1 V range",
          measurements: [
            {
              nomValue:  0.1,
              nomUnit:   "V",
              readings:  [0.099998, 0.099999, 0.100001, 0.099998, 0.099999],
            },
            {
              nomValue:  1,
              nomUnit:   "V",
              readings:  [0.999991, 0.999992, 0.999993, 0.999991, 0.999992],
            },
          ],
        },
      ],
    },
  ],
};

// ─── Run computation ──────────────────────────────────────────────────────────
console.log("Running previewCompute with Fluke 8846A as reference standard…\n");

const result = await previewCompute(instrument);

// ─── Pretty-print budget per measurement ─────────────────────────────────────
const n4 = (v) => v == null ? "—" : Number(v).toExponential(4);
const pct = (v) => v == null ? "—" : `${Number(v).toFixed(6)}%`;

for (const param of result.parameters ?? []) {
  for (const range of param.ranges ?? []) {
    console.log(`\n${"═".repeat(80)}`);
    console.log(`Param: ${param.name}  |  Range: ${range.label}`);
    console.log("═".repeat(80));

    console.log(
      `${"NomValue".padEnd(12)} ${"J-Mean".padEnd(14)} ${"K (TypeA)".padEnd(14)}` +
      ` ${"M (CertUnc)".padEnd(14)} ${"N (M/2)".padEnd(14)} ${"O (OEMAcc)".padEnd(14)}` +
      ` ${"P (LC)".padEnd(14)} ${"Q (Comb)".padEnd(14)} ${"S (k)".padEnd(6)}` +
      ` ${"T (Exp.U)".padEnd(14)} ${"W (%)".padEnd(14)} TracedFrom`
    );
    console.log("─".repeat(180));

    for (const m of range.measurements ?? []) {
      const c = m.computed;
      if (!c) { console.log(`  nomValue=${m.nomValue} → no computed (null readings?)`); continue; }

      const traced = c.tracedFrom
        ? `${c.tracedFrom.equipmentName} | ${c.tracedFrom.range} | unc=${c.tracedFrom.uncertaintyPct?.toFixed(4)}%`
        : "—";

      console.log(
        `${String(m.nomValue).padEnd(12)} ${n4(c.meanValue).padEnd(14)} ${n4(c.stdUcMean).padEnd(14)}` +
        ` ${n4(c.stdUncertainty).padEnd(14)} ${n4(c.ucOfRefStd).padEnd(14)} ${n4(c.ucDueToAccOfRefStd).padEnd(14)}` +
        ` ${n4(c.ucDueToLcOfDuc).padEnd(14)} ${n4(c.combinedUc).padEnd(14)} ${String(c.kFactor ?? "—").padEnd(6)}` +
        ` ${n4(c.expandedUncertainty).padEnd(14)} ${pct(c.percentUc).padEnd(14)} ${traced}`
      );
    }
  }
}

console.log(`\n${"═".repeat(80)}`);
console.log("Done.");
await mongoose.disconnect();
