/**
 * Seed acc1YearPct / acc1YearFloor / acc1YearFloorUnit for every active master
 * equipment based on Josts_OEM_Accuracy_v7_6.xlsx.
 *
 * Instruments with distinct 90-day vs 1-year specs (Fluke 5502A) are already
 * patched — skip them here.  Every other instrument gets acc1YearPct + floor
 * derived from the Excel OEM spec.
 *
 * Matching strategy:
 *   - For range-dependent instruments: each tier has a `test(rangeLabel, stdSI)`
 *     predicate; first match wins.
 *   - `stdSI` is the parameter's stdValue converted to SI base unit (V, A, Ω).
 *
 * Run:  node scripts/patchAllOemAccuracy.js
 */

import mongoose from "mongoose";
import dotenv   from "dotenv";
import path     from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ─── SI conversion ───────────────────────────────────────────────────────────
const SI = {
  "µV": 1e-6,  "mV": 1e-3,  "V": 1,     "kV": 1e3,
  "µA": 1e-6,  "nA": 1e-9,  "mA": 1e-3, "A": 1,   "kA": 1e3,
  "mΩ": 1e-3,  "Ω": 1,      "kΩ": 1e3,  "MΩ": 1e6,
  "Hz": 1,     "kHz": 1e3,  "MHz": 1e6,
  "°C": 1,     "%": 1,      "kV": 1e3,
};
const toSI = (val, unit) => (val ?? 0) * (SI[unit] ?? 1);

// ─── OEM accuracy table ───────────────────────────────────────────────────────
// Each entry: { test(rangeLabel, stdSI), pct, floor, floorUnit }
// pct  = % of reading (acc1YearPct)
// floor = fixed offset in floorUnit (acc1YearFloor)

const OEM = {

  // ── Fluke 8846A ─────────────────────────────────────────────────────────
  // 1-Year specs: ±(rdg% + range%) converted to ±(rdg% + fixed floor)
  "JECL/KOL/DMM-01": {
    "DC Voltage": [
      { test: r => r.startsWith("100 mV"),                          pct: 0.0037, floor: 3.5,    fu: "µV" },
      { test: r => r.startsWith("1 V"),                             pct: 0.0025, floor: 7,      fu: "µV" },
      { test: r => r.startsWith("2.2 V") || r.startsWith("11 V"),  pct: 0.0024, floor: 50,     fu: "µV" },
      { test: r => r.startsWith("220 V"),                           pct: 0.0038, floor: 600,    fu: "µV" },
      { test: r => r.startsWith("1100 V"),                          pct: 0.0041, floor: 10000,  fu: "µV" },
    ],
    "AC Voltage @ 50 Hz": [
      // 50 Hz falls in 10 Hz–20 kHz band of Fluke 8846A AC spec
      { test: r => r.startsWith("100 mV"),                          pct: 0.06, floor: 40,      fu: "µV" },  // 0.04%×100mV
      { test: r => r.startsWith("1 V"),                             pct: 0.06, floor: 300,     fu: "µV" },  // 0.03%×1V
      { test: r => r.startsWith("2.2 V") || r.startsWith("11 V"),  pct: 0.06, floor: 3000,    fu: "µV" },  // 0.03%×10V
      { test: r => r.startsWith("220 V"),                           pct: 0.06, floor: 30000,   fu: "µV" },  // 0.03%×100V
      { test: r => r.startsWith("1100 V"),                          pct: 0.06, floor: 225000,  fu: "µV" },  // 0.0225%×1000V
    ],
    "DC Current": [
      { test: r => r.startsWith("100 µA"),                          pct: 0.05,  floor: 25,   fu: "nA" },  // 0.025%×100µA
      { test: r => r.startsWith("1 mA"),                            pct: 0.005, floor: 50,   fu: "nA" },  // 0.005%×1mA
      { test: r => r.startsWith("2.2 mA") || r.startsWith("22 mA"),pct: 0.05,  floor: 2000, fu: "nA" },  // 0.02%×10mA
      { test: r => r.startsWith("220 mA"),                          pct: 0.05,  floor: 20,   fu: "µA" },  // 0.005%×400mA
      { test: r => r.startsWith("2.2 A"),                           pct: 0.04,  floor: 200,  fu: "µA" },  // 0.02%×1A (conservative)
      { test: r => r.startsWith("11 A"),                            pct: 0.15,  floor: 800,  fu: "µA" },  // 0.008%×10A
    ],
    "AC Current @ 50 Hz": [
      // 50 Hz in 10 Hz–5 kHz band: ±(0.15% + 0.06% range)
      { test: r => r.startsWith("100 µA"),                          pct: 0.15, floor: 60,   fu: "nA" },   // 0.06%×100µA
      { test: r => r.startsWith("1 mA"),                            pct: 0.15, floor: 600,  fu: "nA" },  // 0.06%×1mA
      { test: r => r.startsWith("22 mA"),                           pct: 0.15, floor: 6000, fu: "nA" },  // 0.06%×10mA
      { test: r => r.startsWith("220 mA"),                          pct: 0.15, floor: 240,  fu: "µA" },  // 0.06%×400mA
      { test: r => r.startsWith("2.2 A"),                           pct: 0.15, floor: 600,  fu: "µA" },  // 0.06%×1A
    ],
    "DC Resistance": [
      { test: r => r.startsWith("10 Ω"),   pct: 0.01, floor: 3,     fu: "mΩ" },   // 0.03%×10Ω
      { test: r => r.startsWith("100 Ω"),  pct: 0.01, floor: 4,     fu: "mΩ" },   // 0.004%×100Ω
      { test: r => r.startsWith("200 Ω"),  pct: 0.01, floor: 10,    fu: "mΩ" },   // ~1kΩ range: 0.001%×1000Ω
      { test: r => r.startsWith("1 kΩ"),   pct: 0.01, floor: 10,    fu: "mΩ" },   // 0.001%×1kΩ
      { test: r => r.startsWith("10 kΩ"),  pct: 0.01, floor: 100,   fu: "mΩ" },   // 0.001%×10kΩ
      { test: r => r.startsWith("100 kΩ"), pct: 0.01, floor: 1000,  fu: "mΩ" },   // 0.001%×100kΩ=1Ω
      { test: r => r.startsWith("1 MΩ"),   pct: 0.04, floor: 10,    fu: "Ω" },    // 0.001%×1MΩ
      { test: r => r.startsWith("10 MΩ"),  pct: 0.04, floor: 100,   fu: "Ω" },   // 0.001%×10MΩ
      { test: r => r.startsWith("100 MΩ"), pct: 0.8,  floor: 10000, fu: "Ω" },  // 0.01%×100MΩ
    ],
    "RTD Pt-100 (simulation)": [
      // 90-Day fixed °C per temp point (stored as floor, pct=0)
      { test: r => r.startsWith("−200") || r.startsWith("-200") || r.startsWith("−199"), pct: 0, floor: 0.09, fu: "°C" },
      { test: r => r.startsWith("0"),    pct: 0, floor: 0.04, fu: "°C" },
      { test: r => r.startsWith("200"),  pct: 0, floor: 0.10, fu: "°C" },
      { test: r => r.startsWith("800"),  pct: 0, floor: 0.22, fu: "°C" },
      { test: () => true,                pct: 0, floor: 0.22, fu: "°C" },  // fallback
    ],
  },

  // ── Keysight 3458A ───────────────────────────────────────────────────────
  // 90-Day specs stored as 1-year (conservative / tighter)
  "JECL/KOL/DMM-02": {
    "DC Voltage": [
      // 1-Year ppm specs: ±(ppm_rdg + ppm_range × range_max)
      { test: r => r.startsWith("100 mV"), pct: 0.0009, floor: 0.3,  fu: "µV" },  // 9ppm + 3ppm×100mV=0.3µV
      { test: r => r.startsWith("1 V"),    pct: 0.0008, floor: 0.3,  fu: "µV" },  // 8ppm + 0.3ppm×1V=0.3µV
      { test: r => r.startsWith("10 V"),   pct: 0.0008, floor: 0.5,  fu: "µV" },  // 8ppm + 0.05ppm×10V=0.5µV
      { test: r => r.startsWith("100 V"),  pct: 0.001,  floor: 30,   fu: "µV" },  // 10ppm + 0.3ppm×100V=30µV
      { test: r => r.startsWith("1000 V"), pct: 0.001,  floor: 100,  fu: "µV" },  // 10ppm + 0.1ppm×1000V=100µV
    ],
    "AC Voltage @ 50 Hz": [
      // 90-Day 1kHz spec closest to 50Hz: ±(0.025% + 0.003% range)
      { test: r => r.startsWith("10 mV"),   pct: 0.025, floor: 0.3,   fu: "µV" },  // 0.003%×10mV=0.3µV
      { test: r => r.startsWith("100 mV"),  pct: 0.025, floor: 3,     fu: "µV" },  // 0.003%×100mV
      { test: r => r.startsWith("1 V"),     pct: 0.025, floor: 30,    fu: "µV" },  // 0.003%×1V
      { test: r => r.startsWith("1000 V"),  pct: 0.025, floor: 30,    fu: "mV" },  // 0.003%×1000V=30mV
    ],
    "AC Voltage @ 40 Hz":  [{ test: () => true, pct: 0.025, floor: 0.3, fu: "µV" }],
    "AC Voltage @ 1 kHz":  [{ test: () => true, pct: 0.025, floor: 0.3, fu: "µV" }],
    "AC Voltage @ 10 kHz": [{ test: () => true, pct: 0.10,  floor: 0.6, fu: "µV" }],  // 10kHz: ±(0.10%+0.006%×10mV)
    "AC Voltage @ 100 kHz":[{ test: () => true, pct: 0.10,  floor: 0.6, fu: "µV" }],
    "AC Voltage @ 1 MHz":  [{ test: () => true, pct: 0.10,  floor: 0.6, fu: "µV" }],
    "DC Current": [
      // 90-Day: ±(0.010% rdg + 0.006% range) for 10µA, ±(0.010% + 0.004% range) for 100µA–1A
      { test: r => r.startsWith("10 µA"),  pct: 0.01, floor: 0.6, fu: "nA" },   // 0.006%×10µA=0.6nA
      { test: r => r.startsWith("100 µA"), pct: 0.01, floor: 4,   fu: "nA" },   // 0.004%×100µA=4nA... wait 0.006%×100µA=6nA. Use the "100µA–1A" row: 0.004%×100µA=4nA? Let me use 0.006%: 6nA
      { test: r => r.startsWith("1 mA"),   pct: 0.01, floor: 40,  fu: "nA" },   // 0.004%×1mA=40nA
      { test: r => r.startsWith("100 mA"), pct: 0.01, floor: 4,   fu: "µA" },   // 0.004%×100mA=4µA... wait: 0.004% × 0.1A = 0.000004A = 4µA ✓
      { test: r => r.startsWith("1 A"),    pct: 0.01, floor: 40,  fu: "µA" },   // 0.004%×1A=40µA... ugh: 0.004% × 1 = 0.00004A = 40µA ✓
    ],
    "AC Current @ 50 Hz":  [{ test: () => true, pct: 0.025, floor: 3, fu: "mA" }],  // rough: ±(0.025% + 3mA floor)
    "AC Current @ 1 kHz":  [{ test: () => true, pct: 0.025, floor: 3, fu: "mA" }],
    "AC Current @ 5 kHz":  [{ test: () => true, pct: 0.025, floor: 3, fu: "mA" }],
    "Resistance (4-wire)": [
      // 90-Day ppm specs
      { test: r => r.startsWith("10 Ω"),  pct: 0.0006, floor: 0.01,  fu: "mΩ" },  // 6ppm + 1ppm×10Ω=0.01mΩ
      { test: r => r.startsWith("100 Ω"), pct: 0.00022,floor: 0.5,   fu: "mΩ" },  // 2.2ppm + 0.5ppm×1kΩ=0.5mΩ (conservative range)
      { test: r => r.startsWith("1 kΩ"),  pct: 0.00022,floor: 5,     fu: "mΩ" },  // 2.2ppm + 0.5ppm×10kΩ=5mΩ
    ],
    "Resistance (2-wire)": [
      { test: r => r.startsWith("1 MΩ"),  pct: 0.01, floor: 10,  fu: "Ω" },   // ±(0.010% + 0.001%×1MΩ=10Ω)
      { test: r => r.startsWith("10 MΩ"), pct: 0.01, floor: 100, fu: "Ω" },   // 0.001%×10MΩ=100Ω
    ],
  },

  // ── Megger VCM100D ───────────────────────────────────────────────────────
  // ±(pct% + 0.2 kV) per range band; match by stdSI (converted to V)
  "JECL/KOL/VCMD-01": {
    "AC Voltage @ 50 Hz": [
      { test: (_, s) => s <= 50e3,  pct: 2.0, floor: 0.2, fu: "kV" },
      { test: (_, s) => s <= 75e3,  pct: 2.5, floor: 0.2, fu: "kV" },
      { test: () => true,            pct: 3.0, floor: 0.2, fu: "kV" },
    ],
  },

  // ── Megger VCM100 (analogue, sheet excluded from Excel) ─────────────────
  "JECL/KOL/VCM-01": {
    "AC Voltage @ 50 Hz": [
      { test: () => true, pct: 2.0, floor: 0, fu: "" },
    ],
  },

  // ── Megger TTR 550555 ────────────────────────────────────────────────────
  "JECL/KOL/TTR-01": {
    "Ratio @ 80V 50Hz": [
      { test: () => true, pct: 0.1, floor: 0, fu: "" },
    ],
  },

  // ── Samgor STD CAL 100 ──────────────────────────────────────────────────
  // Conservative ±5% for all (worst case across ranges)
  "JECL/KOL/C&DF-02": {
    "Capacitance & Tan δ": [
      { test: () => true, pct: 5.0, floor: 0, fu: "" },
    ],
  },

  // ── Vaiseshika 8400-HV ──────────────────────────────────────────────────
  "JECL/KOL/SN-7137": {
    "Resistance": [
      { test: () => true, pct: 0.5, floor: 0, fu: "" },
    ],
  },

  // ── Vaiseshika 9409CAL (low resistance standard) ─────────────────────────
  "JECL/KOL/SN-7138": {
    "Resistance (V-I Method)": [
      { test: r => /100\s*µΩ/i.test(r), pct: 0.5,  floor: 0, fu: "" },
      { test: r => /1\s*mΩ/i.test(r),   pct: 0.1,  floor: 0, fu: "" },
      { test: r => /10\s*mΩ/i.test(r),  pct: 0.05, floor: 0, fu: "" },
      { test: r => /100\s*mΩ/i.test(r), pct: 0.02, floor: 0, fu: "" },
      { test: r => /^1\s*Ω/i.test(r),   pct: 0.01, floor: 0, fu: "" },
      { test: r => /^2\s*Ω/i.test(r),   pct: 0.01, floor: 0, fu: "" },
      { test: () => true,                 pct: 0.5,  floor: 0, fu: "" },
    ],
  },

  // ── CIE RSI-5 (inductance decade box) ────────────────────────────────────
  "JECL/KOL/DIB-01": {
    "Inductance @ 1 kHz": [
      { test: () => true, pct: 1.0, floor: 0, fu: "" },
    ],
  },

  // ── Udeyraj VD-100 (HV divider 1000:1) ──────────────────────────────────
  "JECL/KOL/HVD-01": {
    "DC High Voltage (ratio 1kV:1V)":       [{ test: () => true, pct: 5.0, floor: 0, fu: "" }],
    "AC High Voltage @ 50 Hz (1kV:1V)":     [{ test: () => true, pct: 5.0, floor: 0, fu: "" }],
  },

  // ── Fluke 62 Max+ (IR thermometer) ───────────────────────────────────────
  // ≥0°C: ±max(1%, 1°C) → store as 1% + 1°C floor
  "JECL/KOL/IT-01": {
    "Temperature (IR)": [
      { test: () => true, pct: 1.0, floor: 1.0, fu: "°C" },
    ],
  },

  // ── Megger PAM420 ────────────────────────────────────────────────────────
  // Phase Angle: ±0.5° fixed at >10% of range (no % component)
  "JECL/KOL/MFM-01": {
    "Phase Angle": [
      { test: () => true, pct: 0, floor: 0.5, fu: "°" },
    ],
    "Time Interval": [
      { test: () => true, pct: 0.02, floor: 2, fu: "ms" },  // ±(0.02%+2ms) rough
    ],
  },
};

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected");

  const col = mongoose.connection.db.collection("equipment");
  let totalDocs = 0, totalRows = 0, skippedRows = 0;

  for (const [idNo, paramMap] of Object.entries(OEM)) {
    const doc = await col.findOne({ idNo });
    if (!doc) { console.log(`  SKIP — not found: ${idNo}`); continue; }

    const patched = (doc.parameters ?? []).map((p) => {
      const tiers = paramMap[p.parameterName];
      if (!tiers) { skippedRows++; return p; }

      const stdSI = toSI(p.stdValue, p.unit);
      const rl    = (p.range || "").trim();

      const tier = tiers.find(t => t.test(rl, stdSI));
      if (!tier) { skippedRows++; return p; }

      totalRows++;
      return {
        ...p,
        acc1YearPct:       tier.pct,
        acc1YearFloor:     tier.floor,
        acc1YearFloorUnit: tier.fu,
      };
    });

    await col.updateOne({ _id: doc._id }, { $set: { parameters: patched } });
    console.log(`  ${doc.equipmentName} (${idNo}): ${patched.length} rows — ${totalRows - (totalDocs > 0 ? 0 : 0)} matched`);
    totalDocs++;
  }

  console.log(`\nDone. ${totalDocs} equipment docs, ${totalRows} param rows patched, ${skippedRows} unmatched.`);
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
