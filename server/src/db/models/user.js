import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    location : {
      type: String,
      trim: true,
    },
    signatureName : {
      type: String,
      trim: true,
    },
    role : {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
  },
  { timestamps: true }
);


export default mongoose.model("User", userSchema);
