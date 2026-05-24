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
import { BLANK_INSTRUMENT_META, type InstrumentPreset } from "./constants";

/** Map of instrument key (e.g. "Fluke 8846A") → preset data. */
export type InstrumentPresetMap = Record<string, InstrumentPreset>;

// ── Nom-value parsing ──────────────────────────────────────────────────────

const NOM_PATTERN = /^(-?\d*\.?\d+)\s*([a-zµ°Ω]+)?$/i;

// Normalise whatever the user types to the canonical unit string used by toSI.
const UNIT_CANONICAL: Record<string, string> = {
  mv: "mV", v: "V", kv: "kV",
  ua: "µA", µa: "µA", ma: "mA", a: "A", ka: "kA",
  mω: "mΩ", ω: "Ω", kω: "kΩ", mω2: "MΩ", mΩ: "MΩ",
  hz: "Hz", khz: "kHz", mhz: "MHz",
  "°c": "°C", c: "°C",
};

/**
 * Parses a user-entered nominal value string that may include a unit suffix.
 * Case-insensitive: "1mv", "1mV", "0.4v", "40" all parse correctly.
 * Returns null if the string is not a valid number (with optional unit).
 */
export function parseNomInput(raw: string): { value: number; unit: string } | null {
  if (!raw?.trim()) return null;
  const m = raw.trim().match(NOM_PATTERN);
  if (!m) return null;
  const value = parseFloat(m[1]);
  if (isNaN(value)) return null;
  const rawUnit = m[2] ?? "";
  const unit = UNIT_CANONICAL[rawUnit.toLowerCase()] ?? rawUnit;
  return { value, unit };
}

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
    nomUnit:  "",
    readings: emptyReadings(),
    corrected: "",
    computed:  null,
  };
}

/**
 * One Parameter-Config sample point used for "Load example values".
 * (Subset of `ParameterSampleMeasurement` from useGetParameters.)
 */
export interface ParamConfigSample {
  nominal:  string;
  readings: string[];
}

/**
 * Creates a new parameter.
 *
 * Behavior:
 * - If `configRanges` is provided, those range labels are used and (when
 *   `loadExamples` is true) `configSamples[rangeIndex]` becomes the
 *   pre-filled measurements for that range.
 * - Otherwise falls back to instrument-preset range labels (units only;
 *   example samples are no longer sourced from instruments).
 * - Falls through to a blank custom parameter when nothing matches.
 *
 * @param name           - Parameter display name (e.g. "DC Voltage")
 * @param unit           - Unit string override; falls back to preset unit
 * @param instrumentKey  - Key into `presets` (e.g. "Fluke 8846A")
 * @param loadExamples   - Pre-fill sample readings (from `configSamples`)
 * @param presets        - Preset map (typically from `useInstrumentPresets`)
 * @param configRanges   - Range labels from a global Parameter Config entry
 * @param configSamples  - `samples[rangeIndex] = [{ nominal, readings }]`
 */
export function makeParam(
  name = "",
  unit = "",
  instrumentKey = "",
  loadExamples = false,
  presets: InstrumentPresetMap = {},
  configRanges?: string[],
  configSamples?: ParamConfigSample[][],
): Parameter {
  // Parameter Config parameter — use its range labels (+ samples if loading examples)
  if (configRanges && configRanges.length > 0) {
    return {
      id:   uid(),
      name,
      unit,
      isPredefined: true,
      ranges: configRanges.map((label, ri) => {
        const rangeSamples = configSamples?.[ri] ?? [];
        const useSamples = loadExamples && rangeSamples.length > 0;
        return {
          id: uid(),
          label,
          measurements: useSamples
            ? rangeSamples.map((s) => ({
                id:        uid(),
                nomValue:  s.nominal,
                nomUnit:   "",
                readings:  [...s.readings],
                corrected: "",
                computed:  null,
              }))
            : [makeMeasurement(), makeMeasurement()],
        };
      }),
    };
  }

  const preset = presets[instrumentKey];
  const predefinedLabels = preset?.params[name];

  if (predefinedLabels) {
    return {
      id:   uid(),
      name,
      unit: unit || preset.units[name] || "",
      isPredefined: true,
      ranges: predefinedLabels.map((label) => ({
        id: uid(),
        label,
        measurements: [makeMeasurement(), makeMeasurement()],
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
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: uid(),
    meta: { ...meta, calDate: meta.calDate || today },
    params: [],
  };
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
  const parsed  = parseNomInput(nomValue);
  const nom     = parsed?.value ?? parseFloat(nomValue);
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
 *  - 50 points for required metadata fields (nomenclature, make,
 *    modelType, calDate, slNo)
 *  - 50 points for parameters where all readings are "ok"
 *
 * @param inst - The instrument to score
 */
export function getInstCompletion(inst: Instrument): number {
  const metaKeys: (keyof InstrumentMeta)[] = [
    "nomenclature", "make", "modelType", "calDate", "slNo",
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
  return {
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
      jobId:         inst.meta.jobId || undefined,
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
        equipmentId:  inst.meta.refEquipmentId || null,

      },
      parameters: inst.params.map((p) => ({
        name:   p.name,
        unit:   p.unit,
        ranges: p.ranges.map((r) => ({
          label: r.label,
          measurements: r.measurements.map((m) => {
            const parsed = parseNomInput(m.nomValue);
            return {
              nomValue:  parsed ? parsed.value : (m.nomValue === "" ? null : Number(m.nomValue)),
              nomUnit:   parsed?.unit || "",
              readings:  m.readings.map((v) => (v === "" ? null : Number(v))),
              corrected: m.corrected,
            };
          }),
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
 * @param presets   - Preset map used to mark `isPredefined` on parameters
 */
export function mapApiToInstruments(
  apiReport: Record<string, unknown>,
  presets: InstrumentPresetMap = {},
): Instrument[] {
  const instruments = (apiReport.instruments as unknown[]) ?? [];
  return instruments.map((inst: any) => ({
    id: inst._id ?? uid(),
    meta: {
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
      refEquipmentId:  inst.refStandard?.equipmentId
        ? String(inst.refStandard.equipmentId)
        : "",
    },
    params: (inst.parameters ?? []).map((p: any) => ({
      id:           p._id ?? uid(),
      name:         p.name ?? "",
      unit:         p.unit ?? "",
      isPredefined: Object.values(presets).some(
        (preset) => p.name in preset.params,
      ),
      ranges: (p.ranges ?? []).map((r: any) => ({
        id:    r._id ?? uid(),
        label: r.label ?? "",
        measurements: (r.measurements ?? []).map((m: any) => ({
          id:        m._id ?? uid(),
          nomValue:  m.nomValue != null
            ? (m.nomUnit ? `${m.nomValue}${m.nomUnit}` : String(m.nomValue))
            : "",
          nomUnit:   "",
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
