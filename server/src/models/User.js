/**
 * @file User.js
 * @description Mongoose model for application users.
 *
 * All users must register with a @josts.in email. The `password` field
 * has `select: false` so it is never returned by default — callers must
 * explicitly opt in with `.select("+password")`.
 */

import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: true,
      trim:     true,
      minlength: 1,
    },
    email: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
    },
    /** Display name used on calibration certificates. */
    signatureName: {
      type: String,
      trim: true,
    },
    /** Office / lab location shown on certificates. */
    location: {
      type: String,
      trim: true,
    },
    role: {
      type:    String,
      enum:    ["user", "admin"],
      default: "user",
    },
    password: {
      type:     String,
      required: true,
      select:   false,
    },
    /** When false, login is blocked and the user is shown a contact-support message. */
    isActive: {
      type:    Boolean,
      default: true,
    },
    /** Admin who deactivated this account, if applicable. */
    deactivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deactivatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Fast lookups by email (login) and by role (admin queries)
userSchema.index({ email: 1 });
userSchema.index({ role:  1 });

export default mongoose.model("User", userSchema);
