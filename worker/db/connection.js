// server/src/db/db.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let dbConnection = null;

export const connectDB = async () => {
  if (dbConnection) return dbConnection; // return cached connection

  try {
    dbConnection = await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
    return dbConnection;
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
};

export const getDB = () => {
  if (!dbConnection) {
    throw new Error("MongoDB not connected yet. Call connectDB first.");
  }
  return dbConnection;
};
