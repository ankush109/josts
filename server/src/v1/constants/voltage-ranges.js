// ─── Predefined parameter/range constants ─────────────────────────────────────
// stdUncPct : % used in  M = (stdUncPct/100) * nomValue  (Std. Uncertainty)
// accPct    : % used in  O = (accPct/100 * nomValue + accOffset) / sqrt(3)
// accOffset : fixed offset (same formula as above)
// leastCount: LC of DUC  P = (leastCount / 2) / sqrt(3)
// scopePct  : % used in  U = (scopePct/100) * |nomValue|  (Scope Claimed)

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
};

// Quick lookup: paramName → rangeLabel → constants
export const RANGE_CONSTANTS = Object.fromEntries(
  Object.entries(VOLTAGE_RANGES).map(([param, { ranges }]) => [
    param,
    Object.fromEntries(ranges.map((r) => [r.label, r])),
  ])
);
