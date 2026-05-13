/**
 * @file unit-normalize.js
 * @description Converts electrical measurement values to SI base units for
 * unit-aware comparison between report nomValues and master equipment stdValues.
 *
 * SI base units: V (voltage), A (current), Ω (resistance), Hz (frequency), °C (temp)
 */

const SI_FACTORS = {
  mV: 1e-3, V: 1, kV: 1e3,
  µA: 1e-6, uA: 1e-6, mA: 1e-3, A: 1, kA: 1e3,
  mΩ: 1e-3, Ω: 1, kΩ: 1e3, MΩ: 1e6,
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
