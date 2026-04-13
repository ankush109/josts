/**
 * @fileoverview Barrel export for all application hooks.
 *
 * Import hooks from this file in page / component code instead of
 * reaching into individual hook files.
 *
 * @example
 * import { useLoginMutation, useGetCalibrationReports } from "@/app/hooks";
 */

// ── Auth ───────────────────────────────────────────────────────────────────
export { useLoginMutation } from "./mutation/useLoginMutation";
export { useRegisterMutation } from "./mutation/useRegisterMutation";

// ── User ──────────────────────────────────────────────────────────────────
export { useGetUserDetailsQuery } from "./mutation/useGetUserDetails";

// ── Reports (legacy) ──────────────────────────────────────────────────────
export { useGetReportsQuery } from "./query/useGetReports";
export { useGetDraftReports } from "./query/useGetDrafts";
export { useGetReportUrl } from "./query/useGetReportUrl";
export { useGenerateReportMutation } from "./mutation/useGenerateReportMutation";
export { useDeleteReportMutation } from "./mutation/useDeleteReportMutation";
export { useChangeReportStatusMutation } from "./mutation/updateReportStatus";

// ── Calibration Reports ────────────────────────────────────────────────────
export { useGetCalibrationReports } from "./query/useCalibrationReport";
export { useGetCalibrationReportById } from "./query/(calibration)/useGetCalibReportById";
export { useGetAuditLog } from "./query/(calibration)/useGetAuditLog";
export { useGenerateCalibrationReport } from "./mutation/useGenerateCalibrationReport";
export { useUpdateCalibrationReport } from "./mutation/(calibration)/updateCalibrationReport";
export { useComputeCalibration } from "./mutation/(calibration)/useComputeCalibration";
export { useVerifyRejectCalibration } from "./mutation/(calibration)/useVerifyRejectCalibration";
