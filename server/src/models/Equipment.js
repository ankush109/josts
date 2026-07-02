// models/Equipment.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const parameterFieldDef = {
  parameterName:    { type: String },
  range:            { type: String },
  subRange:         { type: String },
  stdValue:         { type: Number },
  ducReading:       { type: Number },
  unit:             { type: String },
  errorPct:         { type: Number },
  uncertaintyPct:   { type: Number },
  accuracy:         { type: Number },
  remarks:          { type: String },
  acc90DayPct:      { type: Number },
  acc90DayFloor:    { type: Number },
  acc90DayFloorUnit:{ type: String },
  acc1YearPct:      { type: Number },
  acc1YearFloor:    { type: Number },
  acc1YearFloorUnit:{ type: String },
  resolution:       { type: String },
  maxBurden:        { type: String },
};

const equipmentSchema = new Schema(
  {
    equipmentName: { type: String, required: true },
    make:          { type: String },
    model:         { type: String },
    serialNo:      { type: String },
    idNo:          { type: String, required: true },
    certificateNo: { type: String },
    calLab:        { type: String },
    calDate:       { type: Date },
    nextDue:       { type: Date },
    nablCert:      { type: String },

    nominalRatio: { type: String },
    parameters:   [parameterFieldDef],

    traceabilityFileKey: { type: String },
    traceabilityFiles: [
      {
        key:        { type: String },
        name:       { type: String },
        uploadedBy: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Versioning — each new calibration cycle creates a snapshot
    currentVersion: { type: Number, default: 1 },
    activeVersion:  { type: Number, default: 1 },
    versions: [
      {
        versionNumber: { type: Number, required: true },
        calDate:       { type: Date },
        nextDue:       { type: Date },
        certificateNo: { type: String },
        nablCert:      { type: String },
        calLab:        { type: String },
        parameters:    [parameterFieldDef],
        traceabilityFileKey: { type: String },
        traceabilityFiles: [
          {
            key:        { type: String },
            name:       { type: String },
            uploadedBy: { type: String },
            uploadedAt: { type: Date, default: Date.now },
          },
        ],
        createdAt:  { type: Date, default: Date.now },
        createdBy:  { type: Schema.Types.ObjectId, ref: "User" },
        note:       { type: String },
      },
    ],

    isActive: { type: Boolean, default: true },
    addedBy:  { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

equipmentSchema.index({ idNo: 1 });
equipmentSchema.index({ nextDue: 1 });
equipmentSchema.index({ nablCert: 1 });

export default mongoose.model("Equipment", equipmentSchema);
