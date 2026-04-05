// ─── Predefined parameter/range constants ─────────────────────────────────────
// stdUncPct : % used in  M = (stdUncPct/100) * nomValue  (Std. Uncertainty)
// accPct    : % used in  O = (accPct/100 * nomValue + accOffset) / sqrt(3)
// accOffset : fixed offset — same unit as nomValue for that range
// leastCount: LC of DUC  P = (leastCount / 2) / sqrt(3)  — same unit as nomValue
// scopePct  : % used in  U = (scopePct/100) * |nomValue|  (Scope Claimed)
//
// Unit convention per range:
//   Voltage  — V  (400mV range: nomValue in V e.g. 0.1, 0.2 …)
//   DC/AC Current — µA for 400µA range; mA for mA ranges; A for 10A range
//   Resistance    — Ω for Ω ranges; kΩ for kΩ ranges; MΩ for MΩ ranges
// ⚠️  Verify accOffset & leastCount against your ref-std calibration certificate

export const VOLTAGE_RANGES = {
  "AC Voltage @50Hz": {
    ranges: [
      { label: "4V/0.001",  stdUncPct: 0.005, accPct: 0.03, accOffset: 60e-6,    leastCount: 0.001, scopePct: 0.079 },
      { label: "40V/0.01",  stdUncPct: 0.008, accPct: 0.03, accOffset: 600e-6,   leastCount: 0.01,  scopePct: 0.079 },
      { label: "400V/0.1",  stdUncPct: 0.008, accPct: 0.05, accOffset: 3000e-6,  leastCount: 0.1,   scopePct: 0.079 },
      { label: "1000V/1",   stdUncPct: 0.008, accPct: 0.05, accOffset: 20000e-6, leastCount: 1,     scopePct: 0.061 },
    ],
  },
  "DC Voltage": {
    ranges: [
      { label: "400mV/0.1", stdUncPct: 0.002,  accPct: 0.006,  accOffset: 3e-6,    leastCount: 0.1,   scopePct: 0.6   },
      { label: "4V/0.001",  stdUncPct: 0.001,  accPct: 0.005,  accOffset: 5e-6,    leastCount: 0.001, scopePct: 0.062 },
      { label: "40V/0.01",  stdUncPct: 0.001,  accPct: 0.005,  accOffset: 50e-6,   leastCount: 0.01,  scopePct: 0.066 },
      { label: "400V/0.1",  stdUncPct: 0.0055, accPct: 0.0055, accOffset: 500e-6,  leastCount: 0.1,   scopePct: 0.066 },
      { label: "1000V/1",   stdUncPct: 0.0055, accPct: 0.0055, accOffset: 1500e-6, leastCount: 1,     scopePct: 0.066 },
    ],
  },
  // ── DC Current — TODO: replace constants with actual ref-std cert values ──────
  "DC Current": {
    ranges: [
      { label: "400µA/0.1",  stdUncPct: 0.002,  accPct: 0.006,  accOffset: 3e-6,    leastCount: 0.1,   scopePct: 0.6   },
      { label: "4mA/0.001",  stdUncPct: 0.001,  accPct: 0.005,  accOffset: 5e-6,    leastCount: 0.001, scopePct: 0.062 },
      { label: "40mA/0.01",  stdUncPct: 0.001,  accPct: 0.005,  accOffset: 50e-6,   leastCount: 0.01,  scopePct: 0.066 },
      { label: "400mA/0.1",  stdUncPct: 0.0055, accPct: 0.0055, accOffset: 500e-6,  leastCount: 0.1,   scopePct: 0.066 },
      { label: "10A/0.01",   stdUncPct: 0.0055, accPct: 0.0055, accOffset: 1500e-6, leastCount: 0.01,  scopePct: 0.066 },
    ],
  },
  // ── AC Current @50Hz — TODO: replace constants with actual ref-std cert values
  "AC Current @50Hz": {
    ranges: [
      { label: "400µA/0.1",  stdUncPct: 0.005, accPct: 0.03, accOffset: 60e-6,    leastCount: 0.1,   scopePct: 0.079 },
      { label: "4mA/0.001",  stdUncPct: 0.008, accPct: 0.03, accOffset: 600e-6,   leastCount: 0.001, scopePct: 0.079 },
      { label: "40mA/0.01",  stdUncPct: 0.008, accPct: 0.05, accOffset: 3000e-6,  leastCount: 0.01,  scopePct: 0.079 },
      { label: "400mA/0.1",  stdUncPct: 0.008, accPct: 0.05, accOffset: 20000e-6, leastCount: 0.1,   scopePct: 0.061 },
      { label: "10A/0.01",   stdUncPct: 0.008, accPct: 0.05, accOffset: 20000e-6, leastCount: 0.01,  scopePct: 0.061 },
    ],
  },
  // ── Resistance — TODO: replace constants with actual ref-std cert values ──────
  "Resistance": {
    ranges: [
      { label: "400Ω/0.1",   stdUncPct: 0.002,  accPct: 0.006,  accOffset: 3e-6,    leastCount: 0.1,   scopePct: 0.6   },
      { label: "4kΩ/0.001",  stdUncPct: 0.001,  accPct: 0.005,  accOffset: 5e-6,    leastCount: 0.001, scopePct: 0.062 },
      { label: "40kΩ/0.01",  stdUncPct: 0.001,  accPct: 0.005,  accOffset: 50e-6,   leastCount: 0.01,  scopePct: 0.066 },
      { label: "400kΩ/0.1",  stdUncPct: 0.0055, accPct: 0.0055, accOffset: 500e-6,  leastCount: 0.1,   scopePct: 0.066 },
      { label: "4MΩ/0.001",  stdUncPct: 0.0055, accPct: 0.0055, accOffset: 1500e-6, leastCount: 0.001, scopePct: 0.066 },
      { label: "40MΩ/0.01",  stdUncPct: 0.0055, accPct: 0.0055, accOffset: 1500e-6, leastCount: 0.01,  scopePct: 0.066 },
    ],
  },
};

// Quick lookup: paramName → rangeLabel → constants
export const RANGE_CONSTANTS = Object.fromEntries(
  Object.entries(VOLTAGE_RANGES).map(([param, { ranges }]) => [
    param,
    Object.fromEntries(ranges.map((r) => [r.label, r])),
  ])
);
