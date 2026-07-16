import { create, all } from "mathjs";

const TINV_TABLE = {
   1: 12.706,  2: 4.303,  3: 3.182,  4: 2.776,  5: 2.571,
   6:  2.447,  7: 2.365,  8: 2.306,  9: 2.262, 10: 2.228,
  11:  2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131,
  16:  2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086,
  21:  2.080, 22: 2.074, 23: 2.069, 24: 2.064, 25: 2.060,
  26:  2.056, 27: 2.052, 28: 2.048, 29: 2.045, 30: 2.042,
};

const K_LARGE_DOF = 2.0;

function tinvLookup(dof) {
  if (!isFinite(dof) || dof > 30) return K_LARGE_DOF;
  return TINV_TABLE[Math.max(1, Math.min(30, Math.floor(dof)))];
}

const math = create(all);

math.import(
  {
    tinv: tinvLookup,
  },
  { override: false }
);

export function evaluateFormula(formulaStr, scope) {
  try {
    const result = math.evaluate(formulaStr, { ...scope });
    if (typeof result !== "number" || !isFinite(result) && !isNaN(result)) {
      return typeof result === "number" ? result : Number(result);
    }
    return result;
  } catch (err) {
    throw new Error(`Formula evaluation error for "${formulaStr}": ${err.message}`);
  }
}

export function evaluateChain(formulas, baseScope) {
  const scope = { ...baseScope };
  const results = {};

  for (const entry of formulas) {
    if (!entry.editable) {
      // J and K are computed in JS and already in scope — just record them
      if (scope[entry.symbol] !== undefined) {
        results[entry.symbol] = scope[entry.symbol];
      }
      continue;
    }

    try {
      const value = evaluateFormula(entry.formula, scope);
      scope[entry.symbol] = value;
      results[entry.symbol] = value;
    } catch (err) {
      results[entry.symbol] = { error: err.message };
      // Keep scope clean — don't add undefined/error values so downstream formulas
      // that don't depend on this symbol can still run
    }
  }

  return results;
}
