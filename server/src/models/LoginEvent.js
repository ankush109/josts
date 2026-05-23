/**
 * @file LoginEvent.js
 * @description One document per successful login. Used for weekly login
 * analytics on the dashboard. Writes are fire-and-forget — failure here
 * never blocks the login response.
 */

import mongoose from "mongoose";

const loginEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ip:     { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

loginEventSchema.index({ createdAt: -1 });

export default mongoose.model("LoginEvent", loginEventSchema);
