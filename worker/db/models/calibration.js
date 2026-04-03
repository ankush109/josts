import mongoose from "mongoose";

const computedSchema = new mongoose.Schema(
  {
    meanValue:           { type: Number, default: null },
    error:               { type: Number, default: null },
    expandedUncertainty: { type: Number, default: null },
    percentUc:           { type: Number, default: null },
  },
  { _id: false }
);

const measurementSchema = new mongoose.Schema(
  {
    nomValue: { type: Number, default: null },
    readings: { type: [Number], default: [] },
    corrected: { type: String, default: "" },
    computed:  { type: computedSchema, default: null },
  },
  { _id: true }
);

const rangeSchema = new mongoose.Schema(
  { label: { type: String, default: "" }, measurements: { type: [measurementSchema], default: [] } },
  { _id: true }
);

const parameterSchema = new mongoose.Schema(
  {
    name:   { type: String, required: true },
    unit:   { type: String, default: "" },
    ranges: { type: [rangeSchema], default: [] },
  },
  { _id: true }
);

const refStandardSchema = new mongoose.Schema(
  {
    name:         { type: String, default: "" },
    make:         { type: String, default: "" },
    modelType:    { type: String, default: "" },
    srNo:         { type: String, default: "" },
    calDueDate:   { type: Date },
    traceability: { type: String, default: "" },
  },
  { _id: false }
);

const environmentalSchema = new mongoose.Schema(
  {
    temperature: { type: String, default: "" },
    humidity:    { type: String, default: "" },
  },
  { _id: false }
);

const instrumentSchema = new mongoose.Schema(
  {
    nomenclature:  { type: String, default: "" },
    make:          { type: String, default: "" },
    modelType:     { type: String, default: "" },
    slNo:          { type: String, default: "" },
    idNo:          { type: String, default: "NA" },
    calDate:       { type: Date },
    environmental: { type: environmentalSchema, default: () => ({}) },
    refStandard:   { type: refStandardSchema,   default: () => ({}) },
    parameters:    { type: [parameterSchema],    default: [] },
  },
  { _id: true }
);

const calibrationReportSchema = new mongoose.Schema(
  {
    csrNo:      { type: String, required: true, unique: true },
    formatNo:   { type: String, default: "JECL/KOL/LAB/FM/36B" },
    status:     { type: String, enum: ["draft", "submitted", "verified", "rejected"], default: "draft" },
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    instruments: { type: [instrumentSchema], default: [] },
    signatures: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    pdfReportId: { type: mongoose.Schema.Types.ObjectId, ref: "Report", default: null },
    filePath:    { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("CalibrationReport", calibrationReportSchema);
