/**
 * @fileoverview Pure utility functions for the calibration form.
 *
 * All functions here are side-effect free and fully unit-testable.
 * They operate on the domain types defined in `@/types/calibration`.
 */

import type {
  Instrument,
  InstrumentMeta,
  Measurement,
  Parameter,
  ReportMeta,
} from "@/types/calibration";
import { INSTRUMENT_PRESETS, BLANK_INSTRUMENT_META } from "./constants";

// ── ID generation ──────────────────────────────────────────────────────────

/**
 * Generates a short random alphanumeric ID.
 * Suitable for transient client-side entity IDs before server assignment.
 *
 * @returns 7-character random base-36 string
 */
export const uid = (): string => Math.random().toString(36).slice(2, 9);

// ── Blank entity factories ─────────────────────────────────────────────────

/**
 * Returns an array of 5 empty reading strings.
 * Always exactly 5 elements — the API contract requires 5 readings per point.
 */
export const emptyReadings = (): string[] => Array(5).fill("");

/**
 * Creates a blank measurement point with a new client-side ID.
 */
export function makeMeasurement(): Measurement {
  return {
    id:       uid(),
    nomValue: "",
    readings: emptyReadings(),
    corrected: "",
    computed:  null,
  };
}

/**
 * Creates a new parameter, optionally pre-populated from the instrument preset.
 *
 * When `name` matches a key in the preset for `instrumentKey`, the parameter
 * gets predefined ranges and units. When `loadExamples` is true, sample
 * readings are loaded from the preset as well.
 *
 * @param name           - Parameter display name (e.g. "DC Voltage")
 * @param unit           - Unit string override; falls back to preset unit
 * @param instrumentKey  - Key into `INSTRUMENT_PRESETS` (e.g. "Fluke 8846A")
 * @param loadExamples   - When true, pre-fills sample readings from the preset
 */
export function makeParam(
  name = "",
  unit = "",
  instrumentKey = "",
  loadExamples = false,
): Parameter {
  const preset = INSTRUMENT_PRESETS[instrumentKey];
  const predefinedLabels = preset?.params[name];

  if (predefinedLabels) {
    const samples = preset.samples[name];
    return {
      id:   uid(),
      name,
      unit: unit || preset.units[name] || "",
      isPredefined: true,
      ranges: predefinedLabels.map((label, ri) => ({
        id: uid(),
        label,
        measurements:
          loadExamples && (samples?.[ri] ?? []).length > 0
            ? samples[ri].map(([nom, readings]) => ({
                id:        uid(),
                nomValue:  nom,
                readings,
                corrected: "",
                computed:  null,
              }))
            : [makeMeasurement(), makeMeasurement()],
      })),
    };
  }

  // Custom (non-preset) parameter
  return {
    id:   uid(),
    name,
    unit,
    ranges: [
      {
        id: uid(),
        label: "",
        measurements: [makeMeasurement(), makeMeasurement()],
      },
    ],
  };
}

/**
 * Creates a blank instrument with the given metadata.
 *
 * @param meta - Instrument metadata; defaults to `BLANK_INSTRUMENT_META`
 */
export function makeInstrument(
  meta: InstrumentMeta = BLANK_INSTRUMENT_META,
): Instrument {
  return { id: uid(), meta: { ...meta }, params: [] };
}

// ── Validation helpers ─────────────────────────────────────────────────────

/** All possible completion states for a parameter. */
export type ParamStatus = "empty" | "partial" | "error" | "ok";

/**
 * Determines whether a reading value is outside the acceptable range.
 *
 * A reading is flagged when it meets or exceeds `nomValue + 1`, which
 * indicates a likely data-entry error.
 *
 * @param val      - The reading string to check
 * @param nomValue - The nominal/set value string for this measurement point
 */
export function isOutOfRange(val: string, nomValue: string): boolean {
  if (val === "" || nomValue === "") return false;
  const reading = parseFloat(val);
  const nom     = parseFloat(nomValue);
  if (isNaN(reading) || isNaN(nom)) return false;
  return reading >= nom + 1;
}

/**
 * Returns true when `v` is either empty or a valid numeric string
 * (integers, decimals, and negative values).
 *
 * @param v - Raw input string to validate
 */
export const isNumericInput = (v: string): boolean =>
  v === "" || /^-?\d*\.?\d*$/.test(v);

/**
 * Computes the overall completion status of a parameter.
 *
 * - `"empty"`   – No readings entered
 * - `"partial"` – Some readings entered but not all
 * - `"error"`   – At least one reading is out of range
 * - `"ok"`      – All readings entered and within range
 *
 * @param param - The parameter to evaluate
 */
export function getParamStatus(param: Parameter): ParamStatus {
  const all = param.ranges.flatMap((r) => r.measurements);
  if (all.length === 0) return "empty";

  let hasAny = false;
  for (const m of all) {
    for (const reading of m.readings) {
      if (isOutOfRange(reading, m.nomValue)) return "error";
      if (reading !== "") hasAny = true;
    }
  }

  const allFilled = all.every((m) => m.readings.every((v) => v !== ""));
  if (allFilled) return "ok";
  if (hasAny)    return "partial";
  return "empty";
}

/**
 * Returns an integer 0–100 representing how complete an instrument's data is.
 *
 * Scoring:
 *  - 50 points for required metadata fields (csrNo, nomenclature, make,
 *    modelType, calDate, slNo)
 *  - 50 points for parameters where all readings are "ok"
 *
 * @param inst - The instrument to score
 */
export function getInstCompletion(inst: Instrument): number {
  const metaKeys: (keyof InstrumentMeta)[] = [
    "csrNo", "nomenclature", "make", "modelType", "calDate", "slNo",
  ];
  const metaScore =
    metaKeys.filter((k) => inst.meta[k]?.trim()).length / metaKeys.length;

  if (inst.params.length === 0) return Math.round(metaScore * 50);

  const okCount = inst.params.filter((p) => getParamStatus(p) === "ok").length;
  return Math.round(metaScore * 50 + (okCount / inst.params.length) * 50);
}

// ── Calculation helpers ────────────────────────────────────────────────────

/**
 * Computes the arithmetic mean of an array of reading strings.
 * Skips empty and NaN values.
 *
 * @param readings - Array of reading strings
 * @returns Mean rounded to 4 decimal places, or null if no valid readings
 */
export function calcMean(readings: string[]): string | null {
  const nums = readings.map(Number).filter((n) => !isNaN(n) && n !== 0);
  if (!nums.length) return null;
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(4);
}

// ── API payload builders ───────────────────────────────────────────────────

/**
 * Builds the API request body for creating or updating a calibration report.
 *
 * @param instruments - Current instrument list from form state
 * @param status      - Target report status ("draft" or "submitted")
 * @param createdBy   - User ID of the report author
 * @param rm          - Top-level report metadata
 */
export function buildPayload(
  instruments: Instrument[],
  status: "draft" | "submitted",
  createdBy: string,
  rm: ReportMeta,
) {
  const csrNo = instruments[0]?.meta.csrNo ?? "";

  return {
    csrNo,
    status,
    createdBy,
    customerName:        rm.customerName,
    customerAddress:     rm.customerAddress,
    customerRefNo:       rm.customerRefNo,
    ducReceivedDate:     rm.ducReceivedDate     || undefined,
    calibrationLocation: rm.calibrationLocation,
    dateOfCalibration:   rm.dateOfCalibration   || undefined,
    calibrationDueDate:  rm.calibrationDueDate  || undefined,
    instruments: instruments.map((inst) => ({
      nomenclature:  inst.meta.nomenclature,
      make:          inst.meta.make,
      modelType:     inst.meta.modelType,
      slNo:          inst.meta.slNo,
      idNo:          inst.meta.idNo,
      othersDetails: inst.meta.othersDetails,
      jobId:         inst.meta.jobId,
      calDate:       inst.meta.calDate || undefined,
      environmental: {
        supplyVoltage: inst.meta.supplyVoltage,
        temperature:   inst.meta.temperature,
        humidity:      inst.meta.humidity,
      },
      refStandard: {
        name:         inst.meta.refStandard,
        make:         inst.meta.refMake,
        modelType:    inst.meta.refModel,
        srNo:         inst.meta.refSrNo,
        calDueDate:   inst.meta.refCalDue || undefined,
        traceability: inst.meta.refTraceability,
      },
      parameters: inst.params.map((p) => ({
        name:   p.name,
        unit:   p.unit,
        ranges: p.ranges.map((r) => ({
          label: r.label,
          measurements: r.measurements.map((m) => ({
            nomValue:  m.nomValue === "" ? null : Number(m.nomValue),
            readings:  m.readings.map((v) => (v === "" ? null : Number(v))),
            corrected: m.corrected,
          })),
        })),
      })),
    })),
  };
}

// ── API response mappers ───────────────────────────────────────────────────

/**
 * Maps the raw API report response to the frontend `Instrument[]` state shape.
 *
 * @param apiReport - Raw report document as returned by the API
 */
export function mapApiToInstruments(apiReport: Record<string, unknown>): Instrument[] {
  const instruments = (apiReport.instruments as unknown[]) ?? [];
  return instruments.map((inst: any) => ({
    id: inst._id ?? uid(),
    meta: {
      csrNo:           (apiReport.csrNo as string) ?? "",
      calDate:         inst.calDate ? inst.calDate.slice(0, 10) : "",
      jobId:           inst.jobId ?? "",
      idNo:            inst.idNo ?? "NA",
      nomenclature:    inst.nomenclature ?? "",
      make:            inst.make ?? "",
      modelType:       inst.modelType ?? "",
      slNo:            inst.slNo ?? "",
      othersDetails:   inst.othersDetails ?? "NA",
      supplyVoltage:   inst.environmental?.supplyVoltage ?? "",
      temperature:     inst.environmental?.temperature ?? "",
      humidity:        inst.environmental?.humidity ?? "",
      refStandard:     inst.refStandard?.name ?? "",
      refMake:         inst.refStandard?.make ?? "",
      refModel:        inst.refStandard?.modelType ?? "",
      refSrNo:         inst.refStandard?.srNo ?? "",
      refCalDue:       inst.refStandard?.calDueDate
        ? inst.refStandard.calDueDate.slice(0, 10)
        : "",
      refTraceability: inst.refStandard?.traceability ?? "",
    },
    params: (inst.parameters ?? []).map((p: any) => ({
      id:           p._id ?? uid(),
      name:         p.name ?? "",
      unit:         p.unit ?? "",
      isPredefined: Object.values(INSTRUMENT_PRESETS).some(
        (preset) => p.name in preset.params,
      ),
      ranges: (p.ranges ?? []).map((r: any) => ({
        id:    r._id ?? uid(),
        label: r.label ?? "",
        measurements: (r.measurements ?? []).map((m: any) => ({
          id:        m._id ?? uid(),
          nomValue:  m.nomValue != null ? String(m.nomValue) : "",
          readings:  Array(5)
            .fill("")
            .map((_, i) =>
              m.readings?.[i] != null ? String(m.readings[i]) : "",
            ),
          corrected: m.corrected ?? "",
          computed:  m.computed ?? null,
        })),
      })),
    })),
  }));
}

/**
 * Maps the raw API report response to the frontend `ReportMeta` state shape.
 *
 * @param r - Raw report document as returned by the API
 */
export function mapApiToReportMeta(r: Record<string, unknown>): ReportMeta {
  return {
    certNo:              (r.certNo as string)              ?? "",
    customerName:        (r.customerName as string)        ?? "",
    customerAddress:     (r.customerAddress as string)     ?? "",
    customerRefNo:       (r.customerRefNo as string)       ?? "",
    ducReceivedDate:     r.ducReceivedDate
      ? (r.ducReceivedDate as string).slice(0, 10)
      : "",
    calibrationLocation:
      (r.calibrationLocation as "onsite" | "at_lab") ?? "at_lab",
    dateOfCalibration:  r.dateOfCalibration
      ? (r.dateOfCalibration as string).slice(0, 10)
      : "",
    calibrationDueDate: r.calibrationDueDate
      ? (r.calibrationDueDate as string).slice(0, 10)
      : "",
  };
}
