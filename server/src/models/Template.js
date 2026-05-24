// models/Template.js
//
// Editable PDF templates. Each template has a stable `key` (e.g.
// "calibration-certificate") that the worker resolves at render time. Any save
// from the admin UI creates a new TemplateVersion document — versions are
// never overwritten or deleted, so rollback is always one click away.

import mongoose from "mongoose";

const { Schema } = mongoose;

const templateSchema = new Schema(
  {
    key:             { type: String, required: true, unique: true },
    name:            { type: String, required: true },
    description:     { type: String, default: "" },
    activeVersionId: { type: Schema.Types.ObjectId, ref: "TemplateVersion", default: null },
  },
  { timestamps: true }
);

const templateVersionSchema = new Schema(
  {
    templateKey:   { type: String, required: true, index: true },
    versionNumber: { type: Number, required: true },
    body:          { type: String, required: true },
    note:          { type: String, default: "" },
    createdBy:     { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

templateVersionSchema.index({ templateKey: 1, versionNumber: -1 });

export const Template        = mongoose.model("Template",        templateSchema);
export const TemplateVersion = mongoose.model("TemplateVersion", templateVersionSchema);
