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

    // From Image 1 - Calibration Results
    nominalRatio: { type: String },                      // "100A/100mV"
    parameters: [
      {
        parameterName: { type: String },                 // "DC High Current"
        stdInputCurrent: { type: Number },               // 10.0014
        actualDropVoltage: { type: Number },             // 9.9793 (UUC mV)
        expectedDropVoltage: { type: Number },           // 10.0014 (DUC mV)
        deviationMv: { type: Number },                   // -0.0221
        errorPct: { type: Number },                      // -0.22
        expandedUncertaintyPct: { type: Number },        // ±0.17
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