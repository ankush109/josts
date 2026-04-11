/**
 * @file Report.js
 * @description Mongoose model for generic (non-calibration) reports.
 *
 * A Report is a document with free-form `content` and a structured
 * `payload`. The PDF is generated asynchronously by the worker and
 * stored at `filePath` in S3 once ready.
 *
 * Status lifecycle:
 *   draft → in_progress → uploaded
 *
 * Approval lifecycle (admin action):
 *   pending → approved | rejected
 */

import mongoose from "mongoose";

/** Tracks who approved or rejected the report and when. */
const approvalSchema = new mongoose.Schema(
  {
    status: {
      type:    String,
      enum:    ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },
    approvedAt: {
      type: Date,
    },
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    title: {
      type:      String,
      required:  true,
      trim:      true,
      minlength: 1,
    },
    content: {
      type:     String,
      required: true,
    },
    status: {
      type:    String,
      enum:    ["in_progress", "uploaded", "draft"],
      default: "in_progress",
    },
    /** S3 key for the generated PDF. Populated by the worker once ready. */
    filePath: {
      type: String,
    },
    approval: {
      type:    approvalSchema,
      default: () => ({ status: "pending" }),
    },
    /** Free-form JSON payload used by the PDF template. */
    payload: {
      type:     mongoose.Schema.Types.Mixed,
      required: true,
    },
    reportedBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
  },
  { timestamps: true }
);

reportSchema.index({ reportedBy: 1, createdAt: -1 });
reportSchema.index({ status: 1 });

export default mongoose.model("Report", reportSchema);
