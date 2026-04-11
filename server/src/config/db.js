/**
 * @file db.js
 * @description MongoDB connection using Mongoose.
 *
 * Call `connectMongo()` once at application start-up. Mongoose will
 * automatically reuse the connection pool for all subsequent queries.
 */

import mongoose from "mongoose";
import logger   from "../lib/logger.js";

/**
 * Opens a connection to MongoDB using the MONGO_URI environment variable.
 * Exits the process on failure — a server without a database is non-functional.
 *
 * @returns {Promise<void>}
 */
export async function connectMongo() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS:          45000,
    });
    logger.info("MongoDB connected");
  } catch (err) {
    logger.error("MongoDB connection failed", err);
    process.exit(1);
  }
}
