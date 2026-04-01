const TINV_TABLE = {
  1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
  6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
  11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131,
  16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086,
  21: 2.080, 22: 2.074, 23: 2.069, 24: 2.064, 25: 2.060,
  26: 2.056, 27: 2.052, 28: 2.048, 29: 2.045, 30: 2.042,
};

function mean(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdev(arr) {
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function tinv(dof) {
  if (!isFinite(dof) || dof > 30) return 2;
  const floored = Math.max(1, Math.min(30, Math.floor(dof)));
  return TINV_TABLE[floored];
}

// ─── Generic uncertainty budget computation ───────────────────────────────────
// stdUnc   : expanded uncertainty from ref standard certificate at this reading
// ucRefAcc : standard uncertainty due to accuracy of ref standard (u_acc directly)
// leastCount: least count of DUC (e.g. 0.001)
// scopePct  : scope claimed as percentage (e.g. 0.04 = 0.04%)

// stdUncPct : % — Std. Uncertainty = (stdUncPct/100) * |nomValue|        [M]
// accPct    : % — accuracy percentage for ref std                         [O numerator]
// accOffset : fixed offset for ref std accuracy spec                      [O numerator]
// leastCount: least count of DUC                                          [P]
// scopePct  : % — scope claimed = (scopePct/100) * |nomValue|            [U]
export function computeUncertaintyBudget({ nomValue, readings, stdUncPct, accPct, accOffset, leastCount, scopePct }) {
  const valid = readings.filter((r) => r != null && !isNaN(r));
  if (!valid.length || nomValue == null) return null;

  const absNom = Math.abs(nomValue);
  const n   = valid.length;
  const J   = mean(valid);                                                        // Mean value
  const err = J - nomValue;                                                       // Error
  const K   = n > 1 ? stdev(valid) / Math.sqrt(n) : 0;                          // u_A (Type A)
  const M   = (stdUncPct  || 0) / 100 * absNom;                                  // Std. Uncertainty
  const N   = M / 2;                                                              // U/c of Ref. Std.
  const O   = ((accPct || 0) / 100 * absNom + (accOffset || 0)) / Math.sqrt(3); // U/c Acc of Ref
  const P   = leastCount ? leastCount / (2 * Math.sqrt(3)) : 0;                 // U/c LC of DUC
  const Q   = Math.sqrt(K ** 2 + N ** 2 + O ** 2 + P ** 2);                    // Combined Uc
  const R   = K === 0 ? Infinity : 4 * (Q ** 4 / K ** 4);                       // Eff. DoF (n-1=4)
  const S   = tinv(R);                                                            // k factor
  const T   = S * Q;                                                              // Expanded Uncertainty
  const U   = (scopePct || 0) / 100 * absNom;                                   // Scope Claimed
  const V   = Math.max(T, U);                                                    // Resulted Expanded U/C
  const W   = absNom ? (V / absNom) * 100 : 0;                                  // % U/C

  return {
    meanValue:           J,
    error:               err,
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

export function computeRow(constants, standardValue, readings) {
  const { stdUncPct, accPct, accOffset, scopePct, leastCount } = constants;

  const J = mean(readings);
  const K = stdev(readings) / Math.sqrt(readings.length);
  const L = 0;
  const M = (stdUncPct / 100) * standardValue;
  const N = M / 2;
  const O = ((accPct / 100) * standardValue + accOffset) / Math.sqrt(3);
  const P = (leastCount / 2) / Math.sqrt(3);
  const Q = Math.sqrt(K ** 2 + L ** 2 + N ** 2 + O ** 2 + P ** 2);
  const R = K === 0 ? Infinity : 4 * (Q ** 4 / K ** 4);
  const S = R > 30 ? 2 : tinv(R);
  const T = S * Q;
  const U = (scopePct / 100) * standardValue;
  const V = Math.max(T, U);
  const W = (V / standardValue) * 100;

  return {
    meanValue: J,
    error: J - standardValue,
    stdUcMean: K,
    combinedUc: Q,
    effectiveDof: R,
    kFactor: S,
    expandedUncertainty: T,
    scopeClaimed: U,
    resultedExpandedUc: V,
    percentUc: W,
  };
}

export function computeParameter(parameterName, rows) {
  const paramConfig = DMM_FORMULAS[parameterName];
  if (!paramConfig) throw new Error(`Unknown parameter: ${parameterName}`);

  return rows.map((row) => {
    const rangeConfig = paramConfig.ranges[row.range];
    if (!rangeConfig) throw new Error(`Unknown range: ${row.range}`);

    const rowConstants = rangeConfig.rows[row.rowIndex];
    if (!rowConstants) throw new Error(`Invalid rowIndex: ${row.rowIndex} for range: ${row.range}`);

    const constants = { ...rowConstants, leastCount: rangeConfig.leastCount };
    const result = computeRow(constants, row.standardValue, row.readings);

    return {
      range: row.range,
      rowIndex: row.rowIndex,
      standardValue: row.standardValue,
      unit: rangeConfig.unit,
      ...result,
    };
  });
}
