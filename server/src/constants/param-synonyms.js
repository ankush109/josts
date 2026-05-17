/**
 * @file param-synonyms.js
 * @description Normalisation + synonym table for matching DUC parameter names
 * against master-equipment parameter names.
 *
 * The Excel traceability workbook uses vendor-style names like
 * "DC High Current", "AC High Voltage @ 50 Hz", "Ratio @ 80V 50Hz".
 * The calibration form sends shorter operator names like
 * "DC Current", "AC Voltage @50Hz", "Ratio".
 *
 * `normalizeParamName` collapses whitespace, lowercases, strips parens
 * and the "High"/"Low" range qualifiers that distinguish nothing for our
 * lookup. That handles most cases automatically.
 *
 * For the remaining mismatches (different suffixes, vendor-specific
 * tags), add an entry to `PARAM_ALIASES` keyed by the normalised
 * form-side name → list of normalised master-side aliases.
 *
 * Used by: services/calibration.service.js → lookupMasterUncertainty
 */

/**
 * Normalises a parameter name for comparison.
 *  - lowercases
 *  - strips parenthetical / bracket qualifiers ("(4-Wire)", "[Series]", "(Hz)")
 *  - strips "high"/"low" range qualifier words
 *  - strips zero-width / non-breaking unicode that survives \s
 *  - removes all whitespace
 */
export function normalizeParamName(s) {
  return (s ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\b(high|low)\b/g, "")
    .replace(/[\u00A0\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "");
}

/**
 * Map of normalised form-side name → list of additional normalised
 * master-side names that should be treated as equivalent.
 *
 * Both sides go through `normalizeParamName` before lookup, so entries
 * here should be the already-normalised form (no spaces, lowercase,
 * no "high"/"low").
 */
export const PARAM_ALIASES = {
  // Ratio - Excel workbook uses voltage-qualified names
  "ratio": ["ratio@80v50hz", "ratio@120v50hz", "ratio@160v50hz"],

  // Clamp meter - form uses full name, equipment master uses plain AC Current
  "clampmeteraccurrent@50hz": ["accurrent@50hz", "accurrent"],

  // AUX. DC Voltage (SVERKER 780) - period in name differs, also maps to plain DC Voltage
  "aux.dcvoltage": ["auxdcvoltage", "dcvoltage"],

  // AC Voltage without freq suffix (SVERKER) ↔ AC Voltage @50Hz (Fluke/Motwane)
  "acvoltage": ["acvoltage@50hz"],
  "acvoltage@50hz": ["acvoltage"],

  // Some equipment sheets omit the "@50Hz" on current entries
  "accurrent@50hz": ["accurrent", "clampmeteraccurrent@50hz"],
  "accurrent": ["accurrent@50hz"],
  "dccurrent": ["dccurrent@50hz"],
};

/**
 * Returns the set of acceptable normalised names that should match
 * the given form-side parameter name.
 */
export function getAcceptableNames(formParamName) {
  const target = normalizeParamName(formParamName);
  return new Set([target, ...(PARAM_ALIASES[target] ?? [])]);
}
