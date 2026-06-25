/**
 * @fileoverview Calibration page constants.
 *
 * Instrument presets (Fluke 8846A, SVERKER 780, …) now live in the
 * `Instrument` master collection and are fetched via `useInstrumentPresets`.
 * This file keeps only types + truly static UI values.
 *
 * Keep `PARAM_TYPES` in sync with `PARAM_TYPES` in
 * server/src/v1/constants/voltage-ranges.js
 */

import type { InstrumentMeta, ReportMeta } from "@/types/calibration";

// ── Parameter type labels ──────────────────────────────────────────────────

/**
 * Display names for all measurable parameter types.
 * Values must match the server's `PARAM_TYPES` constant exactly.
 */
export const PARAM_TYPES = {
  DC_VOLTAGE:            "DC Voltage",
  AC_VOLTAGE_50HZ:       "AC Voltage @50Hz",
  DC_CURRENT:            "DC Current",
  AC_CURRENT_50HZ:       "AC Current @50Hz",
  RESISTANCE:            "Resistance",
  CLAMP_AC_CURRENT_50HZ: "Clamp Meter AC Current @50Hz",
  AC_VOLTAGE:            "AC Voltage",
  AUX_DC_VOLTAGE:        "AUX. DC Voltage",
} as const;

export type ParamTypeKey = keyof typeof PARAM_TYPES;
export type ParamTypeValue = (typeof PARAM_TYPES)[ParamTypeKey];

// ── Instrument preset types ────────────────────────────────────────────────

/** A [nominalValue, readings[5]] tuple used to pre-populate sample data. */
export type SampleMeasurement = [string, string[]];

/** Pre-configured ranges, units, and sample readings for a known instrument. */
export interface InstrumentPreset {
  /** Map of parameter name → array of range labels. */
  params: Record<string, string[]>;
  /** Map of parameter name → default unit string. */
  units: Record<string, string>;
  /** Map of parameter name → array of range → array of sample measurements. */
  samples: Record<string, SampleMeasurement[][]>;
}

// ── Blank state factories (immutable defaults) ─────────────────────────────

/** Default empty report metadata used when creating a new report. */
export const BLANK_REPORT_META: ReportMeta = {
  certNo:              "",
  customerName:        "",
  customerAddress:     "",
  customerRefNo:       "",
  ducReceivedDate:     "",
  calibrationLocation: "at_lab",
  dateOfCalibration:   "",
  calibrationDueDate:  "",
  calibrationInterval: 12,
};

/** Default empty instrument metadata used when adding a new instrument. */
export const BLANK_INSTRUMENT_META: InstrumentMeta = {
  calDate:        "",
  jobId:          "",
  idNo:           "NA",
  nomenclature:   "",
  make:           "",
  modelType:      "",
  slNo:           "",
  othersDetails:  "NA",
  supplyVoltage:         "",
  temperature:           "",
  humidity:              "",
  voltageArea:           "",
  ducRange:              "As Per Instrument Spec.",
  calibrationProcedure:  "",
  calibrationMethod:     "Direct Method",
  refStandard:    "",
  refMake:        "",
  refModel:       "",
  refSrNo:        "",
  refCalDue:      "",
  refTraceability: "",
  refEquipmentId:  "",
};

// ── UI status dot colours ──────────────────────────────────────────────────

/** Tailwind background class for each parameter completion status. */
export const PARAM_STATUS_DOT: Record<string, string> = {
  ok:      "bg-emerald-500",
  partial: "bg-amber-400",
  error:   "bg-red-500",
  empty:   "bg-zinc-300",
};
