import mongoose from "mongoose";

const { Schema } = mongoose;

const formulaEntrySchema = new Schema(
  {
    symbol:      { type: String, required: true },
    label:       { type: String, required: true },
    columnName:  { type: String, required: true },
    formula:     { type: String, required: true },
    description: { type: String, default: "" },
    editable:    { type: Boolean, default: true },
  },
  { _id: false }
);

const formulaConfigSchema = new Schema({
  name:        { type: String, required: true },
  description: { type: String, default: "" },
  isActive:    { type: Boolean, default: false },
  formulas:    { type: [formulaEntrySchema], default: [] },
  createdBy:   { type: Schema.Types.ObjectId, ref: "User" },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now },
});

formulaConfigSchema.index({ isActive: 1 });
formulaConfigSchema.index({ createdAt: -1 });

export default mongoose.model("FormulaConfig", formulaConfigSchema);
