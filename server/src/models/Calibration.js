/**
 * @file Calibration.js
 * @description Mongoose model for electrical calibration reports.
 *
 * Document hierarchy:
 *   CalibrationReport
 *     └── instruments[]          (each physical device under test)
 *           ├── environmental    (supply voltage, temp, humidity)
 *           ├── refStandard      (reference standard used)
 *           └── parameters[]     (e.g. "DC Voltage")
 *                 └── ranges[]   (e.g. "400mV/0.1")
 *                       └── measurements[]
 *                             ├── readings[5]   (raw observed values)
 *                             └── computed      (uncertainty budget — injected server-side)
 *
 * Status lifecycle:
 *   draft → submitted → verified | rejected
 *
 * PDF generation is triggered for any status !== "draft". The worker
 * stores S3 keys in `filePaths[]` once generation succeeds.
 */

import mongoose from "mongoose";

// ─── Uncertainty Budget ───────────────────────────────────────────────────────

/**
 * Computed uncertainty budget for a single measurement row.
 * All values are injected by `injectComputed()` in the calibration service;
 * they are never submitted by the client.
 */
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
    // Which master equipment entry was used for stdUncPct
    tracedFrom: {
      type: new mongoose.Schema({
        equipmentId:    { type: String },
        equipmentName:  { type: String },
        range:          { type: String },
        subRange:       { type: String },
        stdValue:       { type: Number },
        unit:           { type: String },
        uncertaintyPct: { type: Number },
        source:         { type: String }, // "direct" | "derived_from_abs"
      }, { _id: false }),
      default: null,
    },
  },
  { _id: false }
);

// ─── Measurement ──────────────────────────────────────────────────────────────

/** One nominal-value row: 5 observed readings + server-computed budget. */
const measurementSchema = new mongoose.Schema(
  {
    nomValue:  { type: Number, default: null },
    nomUnit:   { type: String, trim: true, default: "" },
    readings:  { type: [Number], default: () => Array(5).fill(null) },
    corrected: { type: String, trim: true, default: "" },
    computed:  { type: computedSchema, default: null },
  },
  { _id: true }
);

// ─── Range ────────────────────────────────────────────────────────────────────

/** A labelled range (e.g. "400mV/0.1") containing several measurement rows. */
const rangeSchema = new mongoose.Schema(
  {
    label:        { type: String, trim: true, default: "" },
    measurements: { type: [measurementSchema], default: [] },
  },
  { _id: true }
);

// ─── Parameter ────────────────────────────────────────────────────────────────

/** A measurand type (e.g. "DC Voltage") with its ranges. */
const parameterSchema = new mongoose.Schema(
  {
    name:   { type: String, required: true, trim: true },
    unit:   { type: String, trim: true, default: "" },
    ranges: { type: [rangeSchema], default: [] },
  },
  { _id: true }
);

// ─── Reference Standard ───────────────────────────────────────────────────────

/** Metadata for the reference standard used during calibration. */
const refStandardSchema = new mongoose.Schema(
  {
    name:         { type: String, trim: true, default: "" },
    make:         { type: String, trim: true, default: "" },
    modelType:    { type: String, trim: true, default: "" },
    srNo:         { type: String, trim: true, default: "" },
    calDueDate:   { type: Date },
    traceability: { type: String, trim: true, default: "" },
    equipmentId:  { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", default: null },
  },
  { _id: false }
);

// ─── Environmental Conditions ─────────────────────────────────────────────────

/** Ambient conditions recorded at calibration time. */
const environmentalSchema = new mongoose.Schema(
  {
    supplyVoltage: { type: String, trim: true, default: "" },
    temperature:   { type: String, trim: true, default: "" },
    humidity:      { type: String, trim: true, default: "" },
  },
  { _id: false }
);

// ─── Instrument (Device Under Calibration) ───────────────────────────────────

/** A single device under calibration with its full measurement tree. */
const instrumentSchema = new mongoose.Schema(
  {
    nomenclature:  { type: String, trim: true, default: "" },
    make:          { type: String, trim: true, default: "" },
    modelType:     { type: String, trim: true, default: "" },
    slNo:          { type: String, trim: true, default: "" },
    idNo:          { type: String, trim: true, default: "NA" },
    othersDetails: { type: String, trim: true, default: "NA" },
    jobId:         { type: String, trim: true, default: "" },
    calDate:       { type: Date },
    environmental: { type: environmentalSchema, default: () => ({}) },
    refStandard:   { type: refStandardSchema,   default: () => ({}) },
    parameters:    { type: [parameterSchema],   default: [] },
  },
  { _id: true }
);

// ─── Signatures ───────────────────────────────────────────────────────────────

/** Who calibrated and who verified the report. */
const signaturesSchema = new mongoose.Schema(
  {
    calibratedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    calibratedAt: { type: Date },
    verifiedAt:   { type: Date },
  },
  { _id: false }
);

// ─── Calibration Report (root document) ──────────────────────────────────────

const calibrationReportSchema = new mongoose.Schema(
  {
    /** Internal certificate number generated server-side. */
    certNo:              { type: String, trim: true, default: "" },
    formatNo:            { type: String, trim: true, default: "JECL/KOL/LAB/FM/36B" },
    status: {
      type:    String,
      enum:    ["draft", "submitted", "verified", "rejected"],
      default: "draft",
    },
    createdBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    customerName:        { type: String, trim: true, default: "" },
    customerAddress:     { type: String, trim: true, default: "" },
    customerRefNo:       { type: String, trim: true, default: "" },
    ducReceivedDate:     { type: Date, default: null },
    calibrationLocation: { type: String, enum: ["onsite", "at_lab"], default: "at_lab" },
    dateOfCalibration:   { type: Date, default: null },
    calibrationDueDate:  { type: Date, default: null },
    instruments:         { type: [instrumentSchema], default: [] },
    signatures:          { type: signaturesSchema, default: () => ({}) },
    /** S3 keys for generated PDF pages. Populated by the worker. */
    filePaths:           { type: [String], default: [] },
    /** Soft-delete timestamp. Non-null means the report is deleted. */
    deletedAt:           { type: Date, default: null },
    /** Total view count — incremented on every getReportById. */
    viewCount:           { type: Number, default: 0 },
    /** Last viewer + when. */
    lastViewedAt:        { type: Date,   default: null },
    lastViewedBy:        { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    /** Per-user view counts, capped to top-N (most recent). */
    viewers: {
      type: [
        new mongoose.Schema(
          {
            userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            count:    { type: Number, default: 1 },
            lastSeen: { type: Date,   default: () => new Date() },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

calibrationReportSchema.index({ createdBy: 1, createdAt: -1 });
calibrationReportSchema.index({ status: 1, createdAt: -1 });
calibrationReportSchema.index(
  {
    "instruments.nomenclature": "text",
    "instruments.make":         "text",
  },
  { name: "report_text_search" }
);

export default mongoose.model("CalibrationReport", calibrationReportSchema);
