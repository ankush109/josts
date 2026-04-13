/**
 * @fileoverview Calibration page constants.
 *
 * All hard-coded values that define the domain model are centralised here
 * so they are easy to find and update without touching component logic.
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

// ── Make → instrument constant key ────────────────────────────────────────

/**
 * Maps the UI "make" dropdown value to the key used by the server's
 * `INSTRUMENT_CONSTANTS` lookup for uncertainty budget parameters.
 */
export const MAKE_TO_INSTRUMENT_KEY: Record<string, string> = {
  Fluke:   "Fluke 8846A",
  SVERKER: "SVERKER 780",
  Motwane: "Motwane DCM45A",
};

// ── Instrument presets ─────────────────────────────────────────────────────

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

/**
 * Per-instrument factory presets keyed by the instrument constant key.
 *
 * Each preset ships with predefined ranges and optional sample readings
 * so engineers can start filling data immediately after selecting a make.
 */
export const INSTRUMENT_PRESETS: Record<string, InstrumentPreset> = {
  "Fluke 8846A": {
    params: {
      [PARAM_TYPES.AC_VOLTAGE_50HZ]: ["4V/0.001", "40V/0.01", "400V/0.1", "1000V/1"],
      [PARAM_TYPES.DC_VOLTAGE]:      ["400mV/0.1", "4V/0.001", "40V/0.01", "400V/0.1", "1000V/1"],
      [PARAM_TYPES.AC_CURRENT_50HZ]: ["40mA/0.01", "400mA/0.1", "4A/0.001", "10A/0.01"],
      [PARAM_TYPES.DC_CURRENT]:      ["40mA/0.01", "400mA/0.1", "4A/0.001", "10A/0.01"],
      [PARAM_TYPES.RESISTANCE]:      ["400Ω/0.1", "4KΩ/0.001", "40KΩ/0.01", "400KΩ/0.1"],
    },
    units: {
      [PARAM_TYPES.AC_VOLTAGE_50HZ]: "V",
      [PARAM_TYPES.DC_VOLTAGE]:      "V",
      [PARAM_TYPES.AC_CURRENT_50HZ]: "mA",
      [PARAM_TYPES.DC_CURRENT]:      "mA",
      [PARAM_TYPES.RESISTANCE]:      "Ω",
    },
    samples: {
      [PARAM_TYPES.AC_VOLTAGE_50HZ]: [
        [["0.5",  ["0.497","0.498","0.499","0.496","0.495"]], ["3.5",  ["3.494","3.497","3.493","3.493","3.493"]]],
        [["5",    ["4.97", "4.98", "4.99", "4.94", "4.97"]], ["35",   ["34.95","34.96","34.97","34.94","34.93"]]],
        [["50",   ["49.9", "50.0", "49.8", "49.6", "49.9"]], ["350",  ["349.8","349.9","349.7","349.7","349.6"]]],
        [["500",  ["498",  "499",  "498",  "497",  "498" ]], ["950",  ["947",  "948",  "948",  "946",  "946" ]]],
      ],
      [PARAM_TYPES.DC_VOLTAGE]: [
        [["0.1",  ["0.0997","0.0998","0.0996","0.0997","0.0995"]], ["0.35", ["0.3496","0.3497","0.3494","0.3495","0.3493"]]],
        [["0.5",  ["0.497", "0.498", "0.499", "0.496", "0.497" ]], ["3.5",  ["3.494", "3.497", "3.493", "3.494", "3.493" ]]],
        [["5",    ["4.97",  "4.98",  "4.99",  "4.94",  "4.97"  ]], ["35",   ["34.95", "34.96", "34.97", "34.94", "34.93" ]]],
        [["50",   ["49.9",  "50.0",  "49.8",  "49.6",  "49.9"  ]], ["350",  ["349.8", "349.9", "349.7", "349.7", "349.6" ]]],
        [["500",  ["498",   "499",   "498",   "497",   "498"   ]], ["950",  ["947",   "948",   "948",   "946",   "946"   ]]],
      ],
      [PARAM_TYPES.AC_CURRENT_50HZ]: [
        [["20",   ["19.97","19.98","19.96","19.97","19.95"]], ["35",   ["34.95","34.96","34.94","34.95","34.93"]]],
        [["200",  ["199.8","199.9","199.7","199.8","199.6"]], ["350",  ["349.8","349.9","349.7","349.8","349.6"]]],
        [["2",    ["1.997","1.998","1.996","1.997","1.995"]], ["3.5",  ["3.495","3.496","3.494","3.495","3.493"]]],
        [["5",    ["4.97", "4.98", "4.96", "4.97", "4.95"]], ["9",    ["8.97", "8.98", "8.96", "8.97", "8.95"]]],
      ],
      [PARAM_TYPES.DC_CURRENT]: [
        [["20",   ["19.97","19.98","19.96","19.97","19.95"]], ["35",   ["34.95","34.96","34.94","34.95","34.93"]]],
        [["200",  ["199.8","199.9","199.7","199.8","199.6"]], ["350",  ["349.8","349.9","349.7","349.8","349.6"]]],
        [["2",    ["1.997","1.998","1.996","1.997","1.995"]], ["3.5",  ["3.495","3.496","3.494","3.495","3.493"]]],
        [["5",    ["4.97", "4.98", "4.96", "4.97", "4.95"]], ["9",    ["8.97", "8.98", "8.96", "8.97", "8.95"]]],
      ],
      [PARAM_TYPES.RESISTANCE]: [
        [["100",  ["99.9", "100.0","99.8", "99.9", "99.7"]], ["350",  ["349.8","349.9","349.7","349.8","349.6"]]],
        [["1",    ["0.999","1.000","0.998","0.999","0.997"]], ["3.5",  ["3.496","3.497","3.495","3.496","3.494"]]],
        [["10",   ["9.97", "9.98", "9.96", "9.97", "9.95"]], ["35",   ["34.93","34.94","34.92","34.93","34.91"]]],
        [["100",  ["99.8", "99.9", "99.7", "99.8", "99.6"]], ["350",  ["349.6","349.7","349.5","349.6","349.4"]]],
      ],
    },
  },

  "SVERKER 780": {
    params: {
      [PARAM_TYPES.AC_CURRENT_50HZ]: ["40A/0.01", "100A/0.01"],
      [PARAM_TYPES.AC_VOLTAGE]:      ["60V/1", "600V/1"],
      [PARAM_TYPES.AUX_DC_VOLTAGE]:  ["130V/1", "220V/1"],
      [PARAM_TYPES.RESISTANCE]:      ["10Ω/1", "100Ω/1", "1000Ω/1", "2.5kΩ/0.001"],
    },
    units: {
      [PARAM_TYPES.AC_CURRENT_50HZ]: "A",
      [PARAM_TYPES.AC_VOLTAGE]:      "V",
      [PARAM_TYPES.AUX_DC_VOLTAGE]:  "V",
      [PARAM_TYPES.RESISTANCE]:      "Ω",
    },
    samples: {
      [PARAM_TYPES.AC_CURRENT_50HZ]: [
        [["30",   ["29.98","30.28","30.18","29.58","29.88"]]],
        [
          ["50",  ["49.93","50.03","49.83","49.93","49.93"]],
          ["60",  ["59.91","60.01","60.11","60.01","59.51"]],
          ["80",  ["79.88","80.28","d",    "79.38","79.78"]],
          ["100", ["99.79","100.19","99.59","99.59","99.79"]],
        ],
      ],
      [PARAM_TYPES.AC_VOLTAGE]: [
        [["30",  ["29.997","30.297","30.197","29.597","29.897"]]],
        [
          ["100", ["99.96", "100.06","99.86", "99.96", "99.96"]],
          ["300", ["299.93","300.03","300.13","300.03","299.53"]],
          ["450", ["449.91","453.91","451.91","444.91","448.91"]],
          ["600", ["599.8", "603.8", "597.8", "597.8", "599.8"]],
        ],
      ],
      [PARAM_TYPES.AUX_DC_VOLTAGE]: [
        [
          ["30",  ["29.998","30.298","30.198","29.598","29.898"]],
          ["100", ["99.97", "100.07","99.87", "99.97", "99.97"]],
        ],
        [
          ["150", ["149.96","150.06","150.16","150.06","149.56"]],
          ["200", ["199.96","203.96","201.96","194.96","198.96"]],
          ["220", ["219.93","223.93","217.93","217.93","219.93"]],
        ],
      ],
      [PARAM_TYPES.RESISTANCE]: [
        [
          ["0.5", ["0.49", "0.52", "0.51", "0.45", "0.48"]],
          ["1",   ["0.99", "1.00", "0.98", "0.99", "0.99"]],
        ],
        [
          ["25",  ["24.98","25.02","25.00","24.93","24.97"]],
          ["100", ["99.98","100.02","99.96","99.96","99.98"]],
        ],
        [["500", ["499.95","499.99","499.97","499.90","499.94"]]],
        [
          ["1",   ["0.9997","1.0001","0.9999","0.9992","0.9996"]],
          ["3",   ["2.4994","2.4998","2.4996","2.4989","2.4993"]],
        ],
      ],
    },
  },
};

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
};

/** Default empty instrument metadata used when adding a new instrument. */
export const BLANK_INSTRUMENT_META: InstrumentMeta = {
  csrNo:          "",
  calDate:        "",
  jobId:          "",
  idNo:           "NA",
  nomenclature:   "",
  make:           "",
  modelType:      "",
  slNo:           "",
  othersDetails:  "NA",
  supplyVoltage:  "",
  temperature:    "",
  humidity:       "",
  refStandard:    "",
  refMake:        "",
  refModel:       "",
  refSrNo:        "",
  refCalDue:      "",
  refTraceability: "",
};

// ── UI status dot colours ──────────────────────────────────────────────────

/** Tailwind background class for each parameter completion status. */
export const PARAM_STATUS_DOT: Record<string, string> = {
  ok:      "bg-emerald-500",
  partial: "bg-amber-400",
  error:   "bg-red-500",
  empty:   "bg-zinc-300",
};
