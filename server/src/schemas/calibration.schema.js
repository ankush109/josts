/**
 * @file calibration.schema.js
 * @description Zod validation schemas for calibration report endpoints.
 *
 * Only the top-level fields of the report body are validated here.
 * The deep instrument/parameter tree is not fully validated because its
 * shape is highly dynamic and already constrained by the Mongoose schema.
 */

import { z } from "zod";

/**
 * Schema for POST /calibration-report (create).
 */
export const createCalibrationSchema = z.object({
  createdBy: z.string().length(24, "Invalid user ID"),
  formatNo:            z.string().optional(),
  status:              z.enum(["draft", "submitted"]).optional(),
  customerName:        z.string().max(200).optional(),
  customerAddress:     z.string().max(500).optional(),
  customerRefNo:       z.string().max(100).optional(),
  ducReceivedDate:     z.string().optional(),
  calibrationLocation: z.enum(["onsite", "at_lab"]).optional(),
  dateOfCalibration:   z.string().optional(),
  calibrationDueDate:  z.string().optional(),
  instruments:         z.array(z.any()).optional(),
  signatures:          z.record(z.string(), z.any()).optional(),
});

/**
 * Schema for the POST /calibration-report/compute (preview) endpoint.
 */
export const computePreviewSchema = z.object({
  instrument: z.record(z.string(), z.any()),
});

/**
 * Schema for PATCH /calibration-report/:id/status (verify / reject).
 */
export const verifyRejectSchema = z.object({
  status: z.enum(["verified", "rejected"]),
});
