// ─── Per-instrument range constants ─────────────────────────────────────────
//
// Each key is an instrument identifier (e.g. make + model or a slug).
// Under each instrument, parameters are keyed by name, and each parameter
// holds an array of range entries with calibration constants.
//
// stdUncPct : % used in  M = (stdUncPct/100) * nomValue  (Std. Uncertainty)
// accPct    : % used in  O = (accPct/100 * nomValue + accOffset) / sqrt(3)
// accOffset : fixed offset — same unit as nomValue for that range
// leastCount: LC of DUC  P = (leastCount / 2) / sqrt(3)  — same unit as nomValue
// scopePct  : % used in  U = (scopePct/100) * |nomValue|  (Scope Claimed)
//
// Unit convention per range:
//   Voltage       — V  (400mV range: nomValue in V e.g. 0.1, 0.2 …)
//   DC/AC Current — µA for 400µA range; mA for mA ranges; A for 10A range
//   Resistance    — Ω for Ω ranges; kΩ for kΩ ranges; MΩ for MΩ ranges
// ⚠️  Verify accOffset & leastCount against each instrument's ref-std cert
// ────────────────────────────────────────────────────────────────────────────

// ─── Parameter type keys ─────────────────────────────────────────────────────
// Use these constants everywhere instead of raw strings so a rename is one edit.
export const PARAM_TYPES = {
  DC_VOLTAGE:            "DC Voltage",
  AC_VOLTAGE_50HZ:       "AC Voltage @50Hz",
  DC_CURRENT:            "DC Current",
  AC_CURRENT_50HZ:       "AC Current @50Hz",
  RESISTANCE:            "Resistance",
  CLAMP_AC_CURRENT_50HZ: "Clamp Meter AC Current @50Hz",
  AC_VOLTAGE:            "AC Voltage",
  AUX_DC_VOLTAGE:        "AUX. DC Voltage",
};

export const INSTRUMENT_CONSTANTS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // Fluke 8846A  (6.5-digit bench multimeter)
  // ═══════════════════════════════════════════════════════════════════════════
  "Fluke 8846A": {
    [PARAM_TYPES.DC_VOLTAGE]: [
      { label: "400mV/0.1", stdUncPct: 0.002,  accPct: 0.006,  accOffset: 3e-6,    leastCount: 0.1,   scopePct: 0.6   },
      { label: "4V/0.001",  stdUncPct: 0.001,  accPct: 0.005,  accOffset: 5e-6,    leastCount: 0.001, scopePct: 0.062 },
      { label: "40V/0.01",  stdUncPct: 0.001,  accPct: 0.005,  accOffset: 50e-6,   leastCount: 0.01,  scopePct: 0.066 },
      { label: "400V/0.1",  stdUncPct: 0.0055, accPct: 0.0055, accOffset: 500e-6,  leastCount: 0.1,   scopePct: 0.066 },
      { label: "1000V/1",   stdUncPct: 0.0055, accPct: 0.0055, accOffset: 1500e-6, leastCount: 1,     scopePct: 0.066 },
    ],
    [PARAM_TYPES.AC_VOLTAGE_50HZ]: [
      { label: "4V/0.001",  stdUncPct: 0.005, accPct: 0.03, accOffset: 60e-6,    leastCount: 0.001, scopePct: 0.079 },
      { label: "40V/0.01",  stdUncPct: 0.008, accPct: 0.03, accOffset: 600e-6,   leastCount: 0.01,  scopePct: 0.079 },
      { label: "400V/0.1",  stdUncPct: 0.008, accPct: 0.05, accOffset: 3000e-6,  leastCount: 0.1,   scopePct: 0.079 },
      { label: "1000V/1",   stdUncPct: 0.008, accPct: 0.05, accOffset: 20000e-6, leastCount: 1,     scopePct: 0.061 },
    ],
    [PARAM_TYPES.AC_CURRENT_50HZ]: [
      { label: "40mA/0.01",  stdUncPct: 0.004, accPct: 0.01,  accOffset: 0.25e-6, leastCount: 0.01,  scopePct: 0.07  },
      { label: "400mA/0.1",  stdUncPct: 0.003, accPct: 0.01,  accOffset: 2.5e-6,  leastCount: 0.1,   scopePct: 0.076 },
      { label: "4A/0.001",   stdUncPct: 0.003, accPct: 0.038, accOffset: 44e-6,   leastCount: 0.001, scopePct: 0.076 },
      { label: "10A/0.01",   stdUncPct: 0.005, accPct: 0.06,  accOffset: 500e-6,  leastCount: 0.01,  scopePct: 0.076 },
    ],
    [PARAM_TYPES.DC_CURRENT]: [
      { label: "40mA/0.01",  stdUncPct: 0.01,  accPct: 0.04, accOffset: 2e-6,    leastCount: 0.01,  scopePct: 0.73  },
      { label: "400mA/0.1",  stdUncPct: 0.02,  accPct: 0.04, accOffset: 20e-6,   leastCount: 0.1,   scopePct: 0.095 },
      { label: "4A/0.001",   stdUncPct: 0.02,  accPct: 0.05, accOffset: 100e-6,  leastCount: 0.001, scopePct: 0.095 },
      { label: "10A/0.01",   stdUncPct: 0.02,  accPct: 0.06, accOffset: 2000e-6, leastCount: 0.01,  scopePct: 0.095 },
    ],
    [PARAM_TYPES.RESISTANCE]: [
      { label: "400Ω/0.1",   stdUncPct: 0.005, accPct: 0.012, accOffset: 0.015,  leastCount: 0.1,   scopePct: 0.17  },
      { label: "4KΩ/0.001",  stdUncPct: 0.002, accPct: 0.009, accOffset: 0.2e-3, leastCount: 0.001, scopePct: 0.014 },
      { label: "40KΩ/0.01",  stdUncPct: 0.002, accPct: 0.009, accOffset: 1e-3,   leastCount: 0.01,  scopePct: 0.014 },
      { label: "400KΩ/0.1",  stdUncPct: 0.002, accPct: 0.012, accOffset: 10e-3,  leastCount: 0.1,   scopePct: 0.02  },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SVERKER 780  (relay test kit)
  //
  // Parameters (order from scope certificate):
  //   1. AC Current @50Hz   — 0-40 A, 0-100 A
  //   2. AC Voltage          — 0-60 V, 0-600 V
  //   3. AUX. DC Voltage     — 20-130 V, 130-220 V
  //   4. Resistance           — 0.5Ω – 2.5 KΩ
  //
  // Formulas decoded from spreadsheet:
  //
  //   Section 1 – AC Current @50Hz (rows 6-10, unit: A)
  //     M = 0.93%*C (row 6) / 0.77%*C (rows 7-10)
  //     O = (1.2%*C + 0.05) / √3
  //     P = (0.01 / 2) / √3
  //     U = 0.77% * |C|
  //
  //   Section 2 – AC Voltage (rows 14-18, unit: V)
  //     M = varies per row (0.125%, 0.183%, 0.207%, 0.207%, 0.199%)
  //     O = (0.3%*C + 0.025) / √3
  //     P = (1 / 2) / √3
  //     U = 0.079% (row 14) / 0.061% (rows 15-18)
  //
  //   Section 3 – AUX. DC Voltage (rows 22-26, unit: V)
  //     M = varies (0.012%, 0.017%, 0.015%, 0.015%, 0.015%)
  //     O row 22 = (0.025%*C + 0.002) / √3
  //     O rows 23-26 = (0.03%*C + 0.02) / √3
  //     P = (1 / 2) / √3
  //     U = 0.066%
  //
  //   Section 4 – Resistance (rows 30-36, unit: Ω)
  //     M = varies (0.047%, 0.047%, 0.047%, 0.047%, 0.029%, 0.03%, 0.035%)
  //     O rows 30-32 = (0.15%*C + 0.2) / √3
  //     O rows 33-34 = (0.05%*C + 0.1) / √3
  //     O rows 35-36 = (0.05%*C + 0.0002) / √3
  //     P = (1 / 2) / √3
  //     U = 0.17% (rows 30-31) / 0.014% (rows 32-36)
  // ═══════════════════════════════════════════════════════════════════════════
  "SVERKER 780": {
    // ─── 1. AC Current @50Hz  (0-40 A, 0-100 A) ────────────────────────────
    [PARAM_TYPES.AC_CURRENT_50HZ]: [
      { label: "40A/0.01",   stdUncPct: 0.93,  accPct: 1.2,  accOffset: 0.05,   leastCount: 0.01, scopePct: 0.77  },
      { label: "100A/0.01",  stdUncPct: 0.77,  accPct: 1.2,  accOffset: 0.05,   leastCount: 0.01, scopePct: 0.77  },
    ],

    // ─── 2. AC Voltage  (0-60 V, 0-600 V) ──────────────────────────────────
    [PARAM_TYPES.AC_VOLTAGE]: [
      { label: "60V/1",   stdUncPct: 0.125,  accPct: 0.3,  accOffset: 0.025,  leastCount: 1,  scopePct: 0.079 },
      { label: "600V/1",  stdUncPct: 0.207,  accPct: 0.3,  accOffset: 0.025,  leastCount: 1,  scopePct: 0.061 },
    ],

    // ─── 3. AUX. DC Voltage  (20-130 V, 130-220 V) ─────────────────────────
    [PARAM_TYPES.AUX_DC_VOLTAGE]: [
      { label: "130V/1",  stdUncPct: 0.012,  accPct: 0.025, accOffset: 0.002,  leastCount: 1,  scopePct: 0.066 },
      { label: "220V/1",  stdUncPct: 0.017,  accPct: 0.03,  accOffset: 0.02,   leastCount: 1,  scopePct: 0.066 },
    ],

    // ─── 4. Resistance  (0.5Ω – 2.5 KΩ) ────────────────────────────────────
    [PARAM_TYPES.RESISTANCE]: [
      { label: "10Ω/1",       stdUncPct: 0.047,  accPct: 0.15,  accOffset: 0.2,    leastCount: 1,     scopePct: 0.17  },
      { label: "100Ω/1",      stdUncPct: 0.047,  accPct: 0.15,  accOffset: 0.2,    leastCount: 1,     scopePct: 0.014 },
      { label: "1000Ω/1",     stdUncPct: 0.047,  accPct: 0.05,  accOffset: 0.1,    leastCount: 1,     scopePct: 0.014 },
      { label: "2.5kΩ/0.001", stdUncPct: 0.03,   accPct: 0.05,  accOffset: 0.0002, leastCount: 0.001, scopePct: 0.014 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Add more instruments here…
  // ═══════════════════════════════════════════════════════════════════════════
  // "Keysight 34465A": {
  //   [PARAM_TYPES.DC_VOLTAGE]: [ ... ],
  //   [PARAM_TYPES.AC_VOLTAGE_50HZ]: [ ... ],
  // },
};

// ─── Helper: build a quick  paramName → rangeLabel → constants  lookup
//     for a given instrument identifier
// ────────────────────────────────────────────────────────────────────────────
export function getInstrumentLookup(instrumentName) {
  const params = INSTRUMENT_CONSTANTS[instrumentName];
  if (!params) return {};

  return Object.fromEntries(
    Object.entries(params).map(([paramName, ranges]) => [
      paramName,
      Object.fromEntries(ranges.map((r) => [r.label, r])),
    ])
  );
}
