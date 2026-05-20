/**
 * @file report.service.js
 * @description Business logic for generic (non-calibration) report management.
 *
 * Reports have two distinct content stores:
 *   - MongoDB: title, content, payload, status, approval
 *   - S3: generated PDF, referenced by `filePath` key
 *
 * The PDF is generated asynchronously by the worker process. `filePath`
 * starts empty and is populated once the worker finishes.
 */

import Report             from "../models/Report.js";
import CalibrationReport  from "../models/Calibration.js";
import { getSignedDownloadUrl, getSignedDownloadUrlAttachment } from "../lib/s3.js";
import { pushPdfJobToRedis }    from "../lib/redis.js";
import logger                   from "../lib/logger.js";

// ─── Report CRUD ──────────────────────────────────────────────────────────────

/**
 * Creates a new report or updates an existing one.
 * If `reportId` is provided the matching document is updated; otherwise
 * a new document is created.
 *
 * PDF generation is queued for any non-draft report.
 *
 * @param {object} data           - Request body fields.
 * @param {string} [data.reportId] - If provided, update this report instead of creating.
 * @param {string} data.title
 * @param {string} data.content
 * @param {*}      data.payload
 * @param {string} [data.status]
 * @param {string} userId         - Authenticated user's ObjectId string.
 * @returns {Promise<object>} The created or updated report document.
 * @throws {Error} With `statusCode: 404` if `reportId` is given but not found.
 * @throws {Error} With `statusCode: 403` if the user does not own the report.
 */
export async function upsertReport(data, userId) {
  const { reportId, title, content, payload, status } = data;
  let report;
  let action = "create";

  if (reportId) {
    report = await Report.findById(reportId);
    if (!report) {
      const err = new Error("Report not found");
      err.statusCode = 404;
      throw err;
    }
    if (report.reportedBy.toString() !== userId) {
      const err = new Error("Forbidden");
      err.statusCode = 403;
      throw err;
    }

    report.title   = title;
    report.content = content;
    report.payload = payload;
    report.status  = "in_progress";
    await report.save();
    action = "edit";
  } else {
    const reportStatus = status === "draft" ? "draft" : "in_progress";
    report = await Report.create({
      title,
      content,
      payload,
      status:     reportStatus,
      reportedBy: userId,
    });
  }

  if (report.status !== "draft") {
    try {
      await pushPdfJobToRedis({ reportId: report._id, action });
    } catch (err) {
      logger.error("Failed to queue PDF job — report saved, PDF regeneration skipped", {
        reportId: String(report._id),
        action,
        error:    err?.message,
      });
    }
  }

  return report;
}

/**
 * Returns all reports visible to the requesting user.
 * Admins see every report with the creator's name + email populated.
 * Regular users see only their own reports.
 *
 * Uses `populate()` to avoid the N+1 query pattern.
 *
 * @param {object} reqUser - Authenticated user from JWT ({ userId, userRole }).
 * @returns {Promise<object[]>}
 */
export async function getReportsForUser(reqUser) {
  if (reqUser.userRole === "admin") {
    return Report.find()
      .sort({ createdAt: -1 })
      .populate("reportedBy", "name email")
      .lean();
  }
  return Report.find({ reportedBy: reqUser.userId })
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Returns a single report, ensuring the requesting user is the owner.
 *
 * @param {string} reportId - MongoDB ObjectId string.
 * @param {string} userId   - Authenticated user's ObjectId string.
 * @returns {Promise<object>}
 * @throws {Error} With `statusCode: 404` if not found.
 * @throws {Error} With `statusCode: 403` if not the owner.
 */
export async function getReportById(reportId, userId) {
  const report = await Report.findById(reportId).lean();
  if (!report) {
    const err = new Error("Report not found");
    err.statusCode = 404;
    throw err;
  }
  if (report.reportedBy.toString() !== userId) {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    throw err;
  }
  return report;
}

/**
 * Returns all draft reports owned by the requesting user.
 *
 * @param {string} userId - Authenticated user's ObjectId string.
 * @returns {Promise<object[]>}
 */
export async function getMyDrafts(userId) {
  return Report.find({ reportedBy: userId, status: "draft" }).lean();
}

/**
 * Deletes a report owned by the requesting user.
 *
 * @param {string} reportId - MongoDB ObjectId string.
 * @param {string} userId   - Authenticated user's ObjectId string.
 * @returns {Promise<void>}
 */
export async function deleteReport(reportId, userId) {
  const report = await Report.findById(reportId);
  if (!report) {
    const err = new Error("Report not found");
    err.statusCode = 404;
    throw err;
  }
  if (report.reportedBy.toString() !== userId) {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    throw err;
  }
  await Report.findByIdAndDelete(reportId);
}

/**
 * Changes the approval status of a report. Restricted to admin users
 * (enforced by `adminMiddleware` in the route — not repeated here).
 *
 * @param {string} reportId  - MongoDB ObjectId string.
 * @param {"pending"|"approved"|"rejected"} status - New approval status.
 * @param {string} adminId   - ObjectId of the admin actioning this change.
 * @returns {Promise<object>} Updated report document.
 */
export async function changeApprovalStatus(reportId, status, adminId) {
  const VALID_STATUSES = ["pending", "approved", "rejected"];
  if (!VALID_STATUSES.includes(status)) {
    const err = new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
    err.statusCode = 400;
    throw err;
  }

  const report = await Report.findById(reportId);
  if (!report) {
    const err = new Error("Report not found");
    err.statusCode = 404;
    throw err;
  }

  report.approval = {
    status,
    approvedBy: adminId,
    approvedAt: new Date(),
  };
  await report.save();
  return report;
}

// ─── Signed URLs ──────────────────────────────────────────────────────────────

/**
 * Generates a pre-signed S3 download URL for a report's PDF.
 * Handles both calibration reports (multiple pages → multiple URLs) and
 * generic reports (single file).
 *
 * @param {string} reportId       - MongoDB ObjectId string.
 * @param {boolean} isCalibration - True when querying a calibration report.
 * @returns {Promise<{ fileUrl?: string, fileUrls?: string[] }>}
 * @throws {Error} With `statusCode: 400` if the PDF is not ready yet.
 */
export async function getReportSignedUrl(reportId, isCalibration, forDownload = false) {
  if (isCalibration) {
    const report = await CalibrationReport.findById(reportId);
    if (!report) {
      const err = new Error("Report not found");
      err.statusCode = 404;
      throw err;
    }
    if (!report.filePaths?.length) {
      const err = new Error("PDF not ready yet");
      err.statusCode = 400;
      throw err;
    }
    const fileUrls = await Promise.all(
      report.filePaths.map((key, i) => {
        if (!forDownload) return getSignedDownloadUrl(key);
        const filename = `${reportId}_instrument_${i + 1}.pdf`.replace(/\s+/g, "_");
        return getSignedDownloadUrlAttachment(key, filename);
      })
    );
    return { fileUrls };
  }

  const report = await Report.findById(reportId);
  if (!report) {
    const err = new Error("Report not found");
    err.statusCode = 404;
    throw err;
  }
  if (report.status !== "uploaded" || !report.filePath) {
    const err = new Error("PDF not ready yet");
    err.statusCode = 400;
    throw err;
  }
  const fileUrl = await getSignedDownloadUrl(report.filePath);
  return { fileUrl };
}
