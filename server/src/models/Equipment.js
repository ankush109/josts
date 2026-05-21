// models/Equipment.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const equipmentSchema = new Schema(
  {
    // From Image 2 - Traceability Master Index
    equipmentName: { type: String, required: true },        // "Shunt 100A-100mV"
    make: { type: String },                              // "thermovolt"
    model: { type: String },                             // "Shunt (100A/100mV)"
    serialNo: { type: String },                          // "—" or actual serial
    idNo: { type: String, required: true },// "JECL/KOL/SHUNT-02"
    certificateNo: { type: String },                     // "04/14 (2025-2026)"
    calLab: { type: String },                            // "ZEAL Mfg. & Calibration..."
    calDate: { type: Date },
    nextDue: { type: Date },
    nablCert: { type: String },                          // "CC-3385"

    nominalRatio: { type: String },
    parameters: [
      {
        parameterName:  { type: String },  // "DC Voltage", "AC Current"
        range:          { type: String },  // "100 mV", "11 V"
        subRange:       { type: String },  // "1 mV", "10 mV"
        stdValue:       { type: Number },  // nominal std value in `unit`
        ducReading:     { type: Number },  // actual reading by DUC
        unit:           { type: String },  // "mV", "V", "µA", "A", "Ω", "kHz"
        errorPct:       { type: Number },
        uncertaintyPct: { type: Number },  // expanded uncertainty % from cert
        remarks:        { type: String },
      },
    ],

    traceabilityFileKey: { type: String },
    traceabilityFiles: [
      {
        key:          { type: String },
        name:         { type: String },
        uploadedBy:   { type: String },
        uploadedAt:   { type: Date, default: Date.now },
      },
    ],

    // App-level metadata
    isActive: { type: Boolean, default: true },
    addedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

equipmentSchema.index({ idNo: 1 });
equipmentSchema.index({ nextDue: 1 });
equipmentSchema.index({ nablCert: 1 });

export default mongoose.model("Equipment", equipmentSchema);