/**
 * @fileoverview Calibration domain types.
 *
 * These are the canonical TypeScript types for the calibration report feature.
 * They are shared between:
 *  - The calibration form page (calibration.tsx)
 *  - The calibration hooks
 *  - The calibration table
 *
 * Keep in sync with the server-side Mongoose schema in
 * server/src/v1/models/CalibrationReport.js
 */

// ── Report-level metadata ──────────────────────────────────────────────────

/** Top-level report fields (customer info, dates, location). */
export interface ReportMeta {
  certNo: string;
  customerName: string;
  customerAddress: string;
  customerRefNo: string;
  ducReceivedDate: string;
  calibrationLocation: "onsite" | "at_lab";
  dateOfCalibration: string;
  calibrationDueDate: string;
}

// ── Instrument metadata ────────────────────────────────────────────────────

/** Per-instrument fields (DUC info, reference standard, environment). */
export interface InstrumentMeta {
  csrNo: string;
  calDate: string;
  jobId: string;
  idNo: string;
  nomenclature: string;
  make: string;
  modelType: string;
  slNo: string;
  othersDetails: string;
  supplyVoltage: string;
  temperature: string;
  humidity: string;
  refStandard: string;
  refMake: string;
  refModel: string;
  refSrNo: string;
  refCalDue: string;
  refTraceability: string;
  refEquipmentId :string
}

// ── Uncertainty budget ─────────────────────────────────────────────────────

/**
 * Computed uncertainty budget for a single measurement point.
 * Populated by the server-side compute endpoint.
 */
export interface TracedFrom {
  equipmentId:    string;
  equipmentName:  string;
  range:          string | null;
  subRange:       string | null;
  stdValue:       number;
  unit:           string;
  uncertaintyPct: number;
  source:         "direct" | "derived_from_abs";
}

export interface ComputedBudget {
  meanValue: number;
  error: number;
  stdUcMean: number;
  stdUncertainty: number;
  ucOfRefStd: number;
  ucDueToAccOfRefStd: number;
  ucDueToLcOfDuc: number;
  combinedUc: number;
  effectiveDof: number | null;
  kFactor: number;
  expandedUncertainty: number;
  scopeClaimed: number;
  resultedExpandedUc: number;
  percentUc: number;
  tracedFrom: TracedFrom | null;
}

// ── Measurement / Range / Parameter hierarchy ──────────────────────────────

/** A single measurement point (nominal value + 5 readings). */
export interface Measurement {
  id: string;
  /** Raw input string — may include a unit suffix e.g. "1mV", "0.4V", or plain "40". */
  nomValue: string;
  /** Parsed unit from nomValue input. Overrides the parameter-level unit for master equipment lookup. */
  nomUnit: string;
  /** Always exactly 5 readings. */
  readings: string[];
  corrected: string;
  /** Null until the compute endpoint has been called. */
  computed: ComputedBudget | null;
}

/** A range group containing one or more measurement points. */
export interface Range {
  id: string;
  label: string;
  measurements: Measurement[];
}

/** A measurable parameter (e.g. DC Voltage) with its ranges. */
export interface Parameter {
  id: string;
  name: string;
  unit: string;
  ranges: Range[];
  /** True for parameters that ship with the instrument preset. */
  isPredefined?: boolean;
}

/** A single instrument under calibration. */
export interface Instrument {
  id: string;
  meta: InstrumentMeta;
  params: Parameter[];
}

// ── UI / form types ────────────────────────────────────────────────────────

/** Which slide-over panel is currently open in the calibration form. */
export type PanelState =
  | null
  | { type: "addInstrument" }
  | { type: "addParam"; instId: string; instrumentKey: string };

/** A validation error surfaced in the form's error panel. */
export interface FormError {
  message: string;
  instId?: string;
  paramId?: string;
  fieldId?: string;
}

/** Auto-save lifecycle states shown in the status badge. */
export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

// ── Report status ──────────────────────────────────────────────────────────

/** All possible lifecycle statuses for a calibration report. */
export type CalibrationReportStatus =
  | "draft"
  | "submitted"
  | "verified"
  | "rejected";

// ── API response shape ─────────────────────────────────────────────────────

/** Signature entry within a calibration report. */
export interface SignatureEntry {
  signatureName?: string;
  name?: string;
}

/** Raw calibration report as returned by the API (before mapping). */
export interface CalibrationReportApiResponse {
  _id: string;
  status: CalibrationReportStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  verifiedAt?: string;
  rejectedAt?: string;
  reportMeta?: Partial<ReportMeta>;
  instruments?: unknown[];
  signatures?: {
    calibratedBy?: SignatureEntry;
    verifiedBy?: SignatureEntry;
  };
  [key: string]: unknown;
}

/** A single field change recorded in an audit entry. */
export interface AuditChange {
  field: string;
  from: string;
  to: string;
}

/** Audit log entry returned by GET /calibration-report/:id/history */
export interface AuditEntry {
  _id: string;
  action: string;
  performedBy: {
    _id?: string;
    name?: string;
    signatureName?: string;
    email?: string;
  };
  createdAt: string;
  changes: AuditChange[];
}
