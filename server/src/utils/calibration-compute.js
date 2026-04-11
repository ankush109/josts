/**
 * @file calibration-compute.js
 * @description Core uncertainty budget calculations for electrical calibration.
 *
 * All computations follow GUM (Guide to the Expression of Uncertainty in
 * Measurement). Variable letters (J–W) match the spreadsheet from which
 * these formulas were derived so they can be cross-referenced.
 *
 * Public API:
 *   computeUncertaintyBudget({ nomValue, readings, ...constants }) → BudgetResult
 */

// ─── t-distribution critical values (two-tailed, 95% confidence) ─────────────
// Indexed by degrees of freedom (1–30). For DoF > 30 the normal approximation
// k = 2.0 is used (coverage factor for ~95.45% confidence).

const TINV_TABLE = {
   1: 12.706,  2: 4.303,  3: 3.182,  4: 2.776,  5: 2.571,
   6:  2.447,  7: 2.365,  8: 2.306,  9: 2.262, 10: 2.228,
  11:  2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131,
  16:  2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086,
  21:  2.080, 22: 2.074, 23: 2.069, 24: 2.064, 25: 2.060,
  26:  2.056, 27: 2.052, 28: 2.048, 29: 2.045, 30: 2.042,
};

/** Normal-approximation k factor for DoF > 30. */
const K_LARGE_DOF = 2.0;

// ─── Statistical primitives ───────────────────────────────────────────────────

/**
 * Arithmetic mean of an array of numbers.
 *
 * @param {number[]} arr - Non-empty array of finite numbers.
 * @returns {number}
 */
function mean(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/**
 * Sample standard deviation (Bessel's correction, n-1 denominator).
 *
 * @param {number[]} arr - Array with at least 2 elements.
 * @returns {number}
 */
function stdev(arr) {
  const m        = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/**
 * Returns the t-distribution critical value for the given degrees of freedom
 * at 95% two-tailed confidence.
 *
 * @param {number} dof - Effective degrees of freedom.
 * @returns {number} t-value (coverage factor k).
 */
function tinv(dof) {
  if (!isFinite(dof) || dof > 30) return K_LARGE_DOF;
  return TINV_TABLE[Math.max(1, Math.min(30, Math.floor(dof)))];
}

// ─── Main computation ─────────────────────────────────────────────────────────

/**
 * @typedef {object} BudgetResult
 * @property {number}      meanValue           - [J] Mean of observed readings.
 * @property {number}      error               - [J - nomValue] Systematic error.
 * @property {number}      stdUcMean           - [K] Type A standard uncertainty (u_A).
 * @property {number}      stdUncertainty      - [M] Std. uncertainty from ref std cert.
 * @property {number}      ucOfRefStd          - [N] U/c of reference standard (M/2).
 * @property {number}      ucDueToAccOfRefStd  - [O] U/c due to accuracy of ref std.
 * @property {number}      ucDueToLcOfDuc      - [P] U/c due to least count of DUC.
 * @property {number}      combinedUc          - [Q] Combined standard uncertainty.
 * @property {number|null} effectiveDof        - [R] Welch-Satterthwaite effective DoF.
 * @property {number}      kFactor             - [S] Coverage factor k.
 * @property {number}      expandedUncertainty - [T] Expanded uncertainty U = k × Uc.
 * @property {number}      scopeClaimed        - [U] Scope claimed by the lab.
 * @property {number}      resultedExpandedUc  - [V] max(T, U).
 * @property {number}      percentUc           - [W] % uncertainty = V / |nomValue| × 100.
 */

/**
 * Computes the full GUM uncertainty budget for a single measurement.
 *
 * Returns `null` if there are no valid readings or `nomValue` is null —
 * callers should treat `null` as "not enough data to compute".
 *
 * @param {object} params
 * @param {number}   params.nomValue   - Nominal (reference) value.
 * @param {number[]} params.readings   - Raw observed readings (nulls pre-filtered by caller).
 * @param {number}   params.stdUncPct  - % for M = (stdUncPct/100) × |nomValue|.
 * @param {number}   params.accPct     - % for O numerator accuracy term.
 * @param {number}   params.accOffset  - Fixed offset for O numerator accuracy term.
 * @param {number}   params.leastCount - Least count of DUC for P computation.
 * @param {number}   params.scopePct   - % for U = (scopePct/100) × |nomValue|.
 * @returns {BudgetResult|null}
 */
export function computeUncertaintyBudget({
  nomValue,
  readings,
  stdUncPct,
  accPct,
  accOffset,
  leastCount,
  scopePct,
}) {
  const valid = (readings ?? []).filter((r) => r != null && !isNaN(r));
  if (!valid.length || nomValue == null) return null;

  const absNom = Math.abs(nomValue);
  const n      = valid.length;

  const J = mean(valid);                                                         // Mean value
  const K = n > 1 ? stdev(valid) / Math.sqrt(n) : 0;                           // u_A (Type A)
  const M = ((stdUncPct  || 0) / 100) * absNom;                                // Std. uncertainty
  const N = M / 2;                                                               // U/c of ref std
  const O = (((accPct || 0) / 100) * absNom + (accOffset || 0)) / Math.sqrt(3); // U/c acc of ref
  const P = leastCount ? leastCount / (2 * Math.sqrt(3)) : 0;                  // U/c LC of DUC
  const Q = Math.sqrt(K ** 2 + N ** 2 + O ** 2 + P ** 2);                     // Combined Uc
  const R = K === 0 ? Infinity : 4 * (Q ** 4 / K ** 4);                        // Effective DoF
  const S = tinv(R);                                                             // Coverage factor k
  const T = S * Q;                                                               // Expanded uncertainty
  const U = ((scopePct || 0) / 100) * absNom;                                  // Scope claimed
  const V = Math.max(T, U);                                                     // Resulted expanded U/C
  const W = absNom ? (V / absNom) * 100 : 0;                                   // % U/C

  return {
    meanValue:           J,
    error:               J - nomValue,
    stdUcMean:           K,
    stdUncertainty:      M,
    ucOfRefStd:          N,
    ucDueToAccOfRefStd:  O,
    ucDueToLcOfDuc:      P,
    combinedUc:          Q,
    effectiveDof:        isFinite(R) ? Math.floor(R) : null,
    kFactor:             S,
    expandedUncertainty: T,
    scopeClaimed:        U,
    resultedExpandedUc:  V,
    percentUc:           W,
  };
}
