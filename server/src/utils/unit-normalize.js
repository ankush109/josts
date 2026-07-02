/**
 * @file unit-normalize.js
 * @description Converts electrical measurement values to SI base units for
 * unit-aware comparison between report nomValues and master equipment stdValues.
 *
 * SI base units: V (voltage), A (current), Ω (resistance), Hz (frequency), °C (temp)
 */

const SI_FACTORS = {
  µV: 1e-6, mV: 1e-3, V: 1, kV: 1e3,
  µA: 1e-6, uA: 1e-6, mA: 1e-3, A: 1, kA: 1e3,
  µΩ: 1e-6, mΩ: 1e-3, Ω: 1, kΩ: 1e3, KΩ: 1e3, MΩ: 1e6,
  pF: 1e-12, nF: 1e-9, µF: 1e-6, mF: 1e-3, F: 1,
  mHz: 1e-3, Hz: 1, kHz: 1e3, MHz: 1e6, GHz: 1e9,
  "°C": 1, C: 1,
};

/**
 * Converts `value` in `unit` to the SI base unit equivalent.
 * Unknown units return the value unchanged.
 *
 * @param {number} value
 * @param {string} unit - e.g. "mV", "kΩ", "µA"
 * @returns {number}
 */
export function toSI(value, unit = "") {
  return value * (SI_FACTORS[unit.trim()] ?? 1);
}

/**
 * Converts `value` from `fromUnit` to `toUnit` via SI.
 * Returns `value` unchanged if either unit is unknown.
 *
 * @param {number} value
 * @param {string} fromUnit
 * @param {string} toUnit
 * @returns {number}
 */
export function convertUnit(value, fromUnit = "", toUnit = "") {
  const si = value * (SI_FACTORS[fromUnit.trim()] ?? 1);
  return si / (SI_FACTORS[toUnit.trim()] ?? 1);
}
