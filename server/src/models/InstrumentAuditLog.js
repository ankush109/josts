import mongoose from "mongoose";

const changeSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    from:  { type: String, default: "" },
    to:    { type: String, default: "" },
  },
  { _id: false }
);

const instrumentAuditLogSchema = new mongoose.Schema(
  {
    instrumentId: { type: mongoose.Schema.Types.ObjectId, ref: "Instrument", required: true, index: true },
    action:       { type: String, enum: ["created", "updated", "activated", "deactivated", "deleted"], required: true },
    performedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    changes:      { type: [changeSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("InstrumentAuditLog", instrumentAuditLogSchema);
