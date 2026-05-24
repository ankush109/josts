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

export const Template        = mongoose.model("Template",        templateSchema);
export const TemplateVersion = mongoose.model("TemplateVersion", templateVersionSchema);
