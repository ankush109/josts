// models/Instrument.js
//
// Master catalog of DUC (Device Under Calibration) instrument templates —
// e.g. "Fluke 8846A", "SVERKER 780", "Motwane DCM45A". Each document carries
// the factory ranges, default units, and sample readings shown as presets in
// the calibration form.

import mongoose from "mongoose";

const { Schema } = mongoose;

const sampleMeasurementSchema = new Schema(
  {
    nominal:  { type: String, required: true },
    readings: { type: [String], default: [] },
  },
  { _id: false }
);

// Calibration constants per range — used by the uncertainty budget math.
// See server/src/constants/instrument-specs.js for the formulae.
const rangeSpecSchema = new Schema(
  {
    label:      { type: String, required: true }, // e.g. "400mV/0.1"
    stdUncPct:  { type: Number, default: 0 },     // M = (stdUncPct/100) × |nom|
    accPct:     { type: Number, default: 0 },     // O = (accPct/100 × |nom| + accOffset) / √3
    accOffset:  { type: Number, default: 0 },
    leastCount: { type: Number, default: 0 },     // P = (leastCount/2) / √3
    scopePct:   { type: Number, default: 0 },     // U = (scopePct/100) × |nom|
  },
  { _id: false }
);

const paramPresetSchema = new Schema(
  {
    parameterName: { type: String, required: true },
    unit:          { type: String, default: "" },
    ranges:        { type: [rangeSpecSchema], default: [] },
    // samples[rangeIndex] is an array of { nominal, readings } points
    samples:       { type: [[sampleMeasurementSchema]], default: [] },
  },
  { _id: false }
);

const instrumentSchema = new Schema(
  {
    key:       { type: String, required: true, unique: true }, // e.g. "Fluke 8846A"
    make:      { type: String, required: true },               // e.g. "Fluke"
    modelType: { type: String, required: true },               // e.g. "8846A"
    parameters: { type: [paramPresetSchema], default: [] },

    isActive: { type: Boolean, default: true },
    addedBy:  { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

instrumentSchema.index({ make: 1 });

export default mongoose.model("Instrument", instrumentSchema);
