import mongoose from "mongoose";

// ─── Measurement ──────────────────────────────────────────────────────────────

const computedSchema = new mongoose.Schema(
  {
    meanValue:           { type: Number, default: null },
    error:               { type: Number, default: null },
    stdUcMean:           { type: Number, default: null },
    stdUncertainty:      { type: Number, default: null },
    ucOfRefStd:          { type: Number, default: null },
    ucDueToAccOfRefStd:  { type: Number, default: null },
    ucDueToLcOfDuc:      { type: Number, default: null },
    combinedUc:          { type: Number, default: null },
    effectiveDof:        { type: Number, default: null },
    kFactor:             { type: Number, default: null },
    expandedUncertainty: { type: Number, default: null },
    scopeClaimed:        { type: Number, default: null },
    resultedExpandedUc:  { type: Number, default: null },
    percentUc:           { type: Number, default: null },
  },
  { _id: false }
);

const measurementSchema = new mongoose.Schema(
  {
    nomValue: { type: Number, default: null },
    readings: { type: [Number], default: () => Array(5).fill(null) },
    corrected: { type: String, trim: true, default: "" },
    computed:  { type: computedSchema, default: null },
  },
  { _id: true }
);

// ─── Range ────────────────────────────────────────────────────────────────────

const rangeSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      default: "",
    },
    measurements: {
      type: [measurementSchema],
      default: [],
    },
  },
  { _id: true }
);

// ─── Parameter ────────────────────────────────────────────────────────────────

const parameterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      trim: true,
      default: "",
    },
    ranges: {
      type: [rangeSchema],
      default: [],
    },
  },
  { _id: true }
);

// ─── Reference Standard ───────────────────────────────────────────────────────

const refStandardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    make: {
      type: String,
      trim: true,
      default: "",
    },
    modelType: {
      type: String,
      trim: true,
      default: "",
    },
    srNo: {
      type: String,
      trim: true,
      default: "",
    },
    calDueDate: {
      type: Date,
    },
    traceability: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

// ─── Environmental Conditions ─────────────────────────────────────────────────

const environmentalSchema = new mongoose.Schema(
  {
    supplyVoltage: {
      type: String,
      trim: true,
      default: "",
    },
    temperature: {
      type: String,
      trim: true,
      default: "",
    },
    humidity: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

// ─── Instrument ───────────────────────────────────────────────────────────────

const instrumentSchema = new mongoose.Schema(
  {
    nomenclature: {
      type: String,
      trim: true,
      default: "",
    },
    make: {
      type: String,
      trim: true,
      default: "",
    },
    modelType: {
      type: String,
      trim: true,
      default: "",
    },
    slNo: {
      type: String,
      trim: true,
      default: "",
    },
    idNo: {
      type: String,
      trim: true,
      default: "NA",
    },
    othersDetails: {
      type: String,
      trim: true,
      default: "NA",
    },
    jobId: {
      type: String,
      trim: true,
      default: "",
    },
    calDate: {
      type: Date,
    },
    environmental: {
      type: environmentalSchema,
      default: () => ({}),
    },
    refStandard: {
      type: refStandardSchema,
      default: () => ({}),
    },
    parameters: {
      type: [parameterSchema],
      default: [],
    },
  },
  { _id: true }
);

// ─── Signatures ───────────────────────────────────────────────────────────────

const signaturesSchema = new mongoose.Schema(
  {
    calibratedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    calibratedAt: {
      type: Date,
    },
    verifiedAt: {
      type: Date,
    },
  },
  { _id: false }
);

// ─── Calibration Report ───────────────────────────────────────────────────────

const calibrationReportSchema = new mongoose.Schema(
  {
    csrNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    formatNo: {
      type: String,
      trim: true,
      default: "JECL/KOL/LAB/FM/36B",
    },
    status: {
      type: String,
      enum: ["draft", "submitted", "verified", "rejected"],
      default: "draft",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    instruments: {
      type: [instrumentSchema],
      default: [],
    },
    signatures: {
      type: signaturesSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

calibrationReportSchema.index({ createdBy: 1, createdAt: -1 });
calibrationReportSchema.index({ status: 1, createdAt: -1 });
calibrationReportSchema.index(
  {
    csrNo: "text",
    "instruments.nomenclature": "text",
    "instruments.make": "text",
  },
  { name: "report_text_search" }
);

// ─── Export ───────────────────────────────────────────────────────────────────

export default mongoose.model("CalibrationReport", calibrationReportSchema);