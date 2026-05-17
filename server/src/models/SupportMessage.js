import mongoose from "mongoose";

const supportMessageSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName:  { type: String, required: true },
    userEmail: { type: String, required: true },
    subject:   { type: String, required: true, trim: true, maxlength: 200 },
    message:   { type: String, required: true, trim: true, maxlength: 2000 },

    // Admin response
    reply:      { type: String,  default: null, maxlength: 2000 },
    repliedBy:  { type: String,  default: null },
    repliedAt:  { type: Date,    default: null },

    // Read receipt — set when admin first opens the thread
    seenByAdmin: { type: Boolean, default: false },
    seenAt:      { type: Date,    default: null },

    status: {
      type:    String,
      enum:    ["open", "replied"],
      default: "open",
    },
  },
  { timestamps: true }
);

supportMessageSchema.index({ userId: 1, createdAt: -1 });
supportMessageSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("SupportMessage", supportMessageSchema);
