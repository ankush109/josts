import mongoose from "mongoose";

const { Schema } = mongoose;

const rangeSpecSchema = new Schema(
  {
    label:      { type: String, required: true },
    stdUncPct:  { type: Number, default: 0 },
    accPct:     { type: Number, default: 0 },
    accOffset:  { type: Number, default: 0 },
    leastCount: { type: Number, default: 0 },
    scopePct:   { type: Number, default: 0 },
  },
  { _id: false }
);

const sampleMeasurementSchema = new Schema(
  {
    nominal:  { type: String, required: true },
    readings: { type: [String], default: [] },
  },
  { _id: false }
);

const parameterSchema = new Schema(
  {
    parameterName: { type: String, required: true, unique: true, trim: true },
    unit:          { type: String, default: "", trim: true },
    isActive:      { type: Boolean, default: true },
    ranges:        { type: [rangeSpecSchema], default: [] },
    samples:       { type: [[sampleMeasurementSchema]], default: [] },
    addedBy:       { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

parameterSchema.index({ isActive: 1 });

export default mongoose.model("Parameter", parameterSchema);
