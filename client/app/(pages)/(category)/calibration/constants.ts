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

/** Standard remarks printed on every calibration certificate unless the user edits them. */
export const DEFAULT_REMARKS: readonly string[] = [
  "DUC : Device Under Calibration.",
  "Average of 5 reading has been taken in DUC.",
  "This certificate refer only to the particular item submitted for calibration",
  "The results in the certificate are valid at the time of measurement under stated conditions.",
  "Calibration sticker has been affix on the calibrated sample indicating \"CALIBRATION STATUS\".",
  "The certificate should not be produced except in full without prior approval from the Technical Manager and / or the Quality Manager",
  "Measurement Uncertainty reported is at appproximately 95% of Confidence Level with k = 2, Units of measurement results and uncertainty are the same as that of a range selected Unless otherwise indicated.",
];

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
  layoutStyle:         "current",
  letterHeadStyle:     "kol",
  remarks:             [...DEFAULT_REMARKS],
};

/** UI dropdown options for the letterhead style. */
export const LETTER_HEAD_OPTIONS = [
  { value: "kol"          as const, label: "Kolkata — plain",             hint: "No QR · No NABL" },
  { value: "kol_nabl"     as const, label: "Kolkata — NABL + QR",         hint: "NABLC0526WB04743" },
  { value: "del_non_nabl" as const, label: "Delhi — Non-NABL (QR only)",  hint: "Gopal Heights, New Delhi" },
];

/** Human-readable labels + format numbers for each PDF layout option. */
export const LAYOUT_STYLE_OPTIONS = [
  { value: "current" as const, label: "Certificate (default)",   formatNo: "JECL/KOL/LAB/FM/36B" },
  { value: "fm36"    as const, label: "Draft — Direct",          formatNo: "JECL/KOL/LAB/FM/36"  },
  { value: "fm36a"   as const, label: "Draft — Comparison",      formatNo: "JECL/KOL/LAB/FM/36A" },
  { value: "fm36b"   as const, label: "Draft — Direct (IR)",     formatNo: "JECL/KOL/LAB/FM/36B" },
];

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
  idNoInReport:          false,
  slNoInReport:          true,
  ducRange:              "As Per Instrument Spec.",
  calibrationProcedure:  "",
  calibrationMethod:     "Direct Method",
  refStandard:    "",
  refMake:        "",
  refModel:       "",
  refSrNo:        "",
  refCalDue:      "",
  refTraceability: "",
  refEquipmentIds: [],
  refStandards:   [],
};

// ── SI unit families ───────────────────────────────────────────────────────

/** All scaled SI variants for each measurable quantity, ordered small → large. */
export const SI_UNIT_FAMILIES: Record<string, string[]> = {
  V:    ["µV", "mV", "V", "kV", "MV"],
  A:    ["pA", "nA", "µA", "mA", "A", "kA"],
  Ω:    ["mΩ", "Ω", "kΩ", "MΩ"],
  Hz:   ["Hz", "kHz", "MHz"],
  W:    ["µW", "mW", "W", "kW", "MW"],
  "°C": ["°C"],
  "%":  ["%", "%RH"],
  VA:   ["VA", "kVA", "MVA"],
};

/** Maps any unit variant back to its family key in SI_UNIT_FAMILIES. */
export const UNIT_TO_FAMILY_KEY: Record<string, string> = {
  "µV": "V",  "mV": "V",  "V": "V",  "kV": "V",  "MV": "V",
  "pA": "A",  "nA": "A",  "µA": "A", "mA": "A", "A": "A", "kA": "A",
  "mΩ": "Ω",  "Ω": "Ω",  "kΩ": "Ω", "MΩ": "Ω",
  "Hz": "Hz", "kHz": "Hz","MHz": "Hz",
  "µW": "W",  "mW": "W",  "W": "W",  "kW": "W", "MW": "W",
  "°C": "°C",
  "%": "%",   "%RH": "%",
  "VA": "VA", "kVA": "VA","MVA": "VA",
};

// ── UI status dot colours ──────────────────────────────────────────────────

/** Tailwind background class for each parameter completion status. */
export const PARAM_STATUS_DOT: Record<string, string> = {
  ok:      "bg-emerald-500",
  partial: "bg-amber-400",
  error:   "bg-red-500",
  empty:   "bg-zinc-300",
};
