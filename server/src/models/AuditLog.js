import mongoose from "mongoose";

const changeSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    from:  { type: String, default: "" },
    to:    { type: String, default: "" },
  },
  { _id: false }
);

const auditLogSchema = new mongoose.Schema(
  {
    reportId:    { type: mongoose.Schema.Types.ObjectId, ref: "CalibrationReport", required: true, index: true },
    action:      { type: String, enum: ["created", "updated", "status_changed", "deleted"], required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    changes:     { type: [changeSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", auditLogSchema);
