/**
 * @file instrument-specs.js
 * @description Per-instrument calibration constants used in the uncertainty budget.
 *
 * Structure:
 *   INSTRUMENT_CONSTANTS[instrumentName][parameterType] = RangeSpec[]
 *
 * Each RangeSpec contains:
 *   label      — display label, also used as the lookup key (e.g. "400mV/0.1")
 *   stdUncPct  — % — Standard Uncertainty = (stdUncPct / 100) × |nomValue|   [M]
 *   accPct     — % — used in O = (accPct / 100 × |nomValue| + accOffset) / √3
 *   accOffset  — fixed offset in the same unit as nomValue                    [O]
 *   leastCount — least count of the DUC  P = (leastCount / 2) / √3           [P]
 *   scopePct   — % — scope claimed U = (scopePct / 100) × |nomValue|         [U]
 *
 * Unit convention per range:
 *   Voltage       — V   (400mV range: nomValues in V, e.g. 0.1, 0.2 …)
 *   DC/AC Current — mA for mA ranges; A for A ranges
 *   Resistance    — Ω for Ω ranges; kΩ for kΩ ranges
 *
 * ⚠️  Verify accOffset and leastCount against each instrument's ref-std certificate
 *     before using in a real calibration run.
 */

// ─── Parameter type keys ─────────────────────────────────────────────────────
// Use these constants everywhere instead of raw strings — a rename is one edit.

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

// ─── Instrument constants ─────────────────────────────────────────────────────

export const INSTRUMENT_CONSTANTS = {

  // ═══════════════════════════════════════════════════════════════════════════
  // Fluke 8846A — 6.5-digit bench multimeter
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
  // SVERKER 780 — relay test kit
  //
  // Sections (from scope certificate):
  //   1. AC Current @50Hz  — 0-40 A, 0-100 A
  //   2. AC Voltage        — 0-60 V, 0-600 V
  //   3. AUX. DC Voltage   — 20-130 V, 130-220 V
  //   4. Resistance        — 0.5 Ω – 2.5 kΩ
  // ═══════════════════════════════════════════════════════════════════════════
  "SVERKER 780": {
    [PARAM_TYPES.AC_CURRENT_50HZ]: [
      { label: "40A/0.01",  stdUncPct: 0.93, accPct: 1.2, accOffset: 0.05, leastCount: 0.01, scopePct: 0.77 },
      { label: "100A/0.01", stdUncPct: 0.77, accPct: 1.2, accOffset: 0.05, leastCount: 0.01, scopePct: 0.77 },
    ],
    [PARAM_TYPES.AC_VOLTAGE]: [
      { label: "60V/1",  stdUncPct: 0.125, accPct: 0.3, accOffset: 0.025, leastCount: 1, scopePct: 0.079 },
      { label: "600V/1", stdUncPct: 0.207, accPct: 0.3, accOffset: 0.025, leastCount: 1, scopePct: 0.061 },
    ],
    [PARAM_TYPES.AUX_DC_VOLTAGE]: [
      { label: "130V/1", stdUncPct: 0.012, accPct: 0.025, accOffset: 0.002, leastCount: 1, scopePct: 0.066 },
      { label: "220V/1", stdUncPct: 0.017, accPct: 0.03,  accOffset: 0.02,  leastCount: 1, scopePct: 0.066 },
    ],
    [PARAM_TYPES.RESISTANCE]: [
      { label: "10Ω/1",       stdUncPct: 0.047, accPct: 0.15, accOffset: 0.2,    leastCount: 1,     scopePct: 0.17  },
      { label: "100Ω/1",      stdUncPct: 0.047, accPct: 0.15, accOffset: 0.2,    leastCount: 1,     scopePct: 0.014 },
      { label: "1000Ω/1",     stdUncPct: 0.047, accPct: 0.05, accOffset: 0.1,    leastCount: 1,     scopePct: 0.014 },
      { label: "2.5kΩ/0.001", stdUncPct: 0.03,  accPct: 0.05, accOffset: 0.0002, leastCount: 0.001, scopePct: 0.014 },
    ],
  },

  // Add more instruments below following the same pattern.
  // "Keysight 34465A": { ... },
};

// ─── Lookup helper ────────────────────────────────────────────────────────────

/**
 * Builds a two-level lookup map for a given instrument:
 *   paramName → rangeLabel → RangeSpec
 *
 * Used by `injectComputed()` for O(1) constant lookups per measurement.
 * Returns an empty object if the instrument is not found (no match for
 * the make+model combination — caller should log a warning).
 *
 * @param {string} instrumentName - Concatenation of make + " " + modelType.
 * @returns {Record<string, Record<string, object>>}
 */
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
