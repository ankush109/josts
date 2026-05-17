/**
 * @fileoverview Centralised API endpoint factory functions.
 *
 * Every endpoint is a pure function so call-sites remain readable and
 * the compiler catches missing / wrong-typed arguments.
 *
 * Grouped by resource:
 *  - Auth
 *  - User
 *  - Reports (legacy)
 *  - Calibration Reports
 */

// ── Auth ───────────────────────────────────────────────────────────────────

/** POST /auth/login */
export const EP_LOGIN = () => `/auth/login` as const;

/** POST /auth/register */
export const EP_REGISTER = () => `/auth/register` as const;

// ── User ──────────────────────────────────────────────────────────────────

/** GET /user/profile  |  PUT /user/profile */
export const EP_USER_PROFILE = () => `/user/profile` as const;

// ── Reports (legacy) ──────────────────────────────────────────────────────

/** GET /report  |  GET /report/:id */
export const EP_REPORTS = (id?: string | number) =>
  id ? `/report/${id}` : `/report`;

/** GET /report/drafts */
export const EP_DRAFTS = () => `/report/drafts` as const;

/** GET /report/drafts/:reportId */
export const EP_DRAFT_BY_ID = (reportId: string | number) =>
  `/report/drafts/${reportId}`;

export const EP_EQUIPMENTS_BY_ID = (equipmentId: string | number) =>
  `/equipments/${equipmentId}`;


/** PATCH /report/:reportId/draft */
export const EP_CHANGE_REPORT_DRAFT = (reportId: string | number) =>
  `/report/${reportId}/draft`;

/** PATCH /report/:reportId/:status */
export const EP_CHANGE_REPORT_STATUS = (
  reportId: string | number,
  status: string,
) => `/report/${reportId}/${status}`;

/** DELETE /report/:reportId */
export const EP_DELETE_DRAFT = (reportId: string | number) =>
  `/report/${reportId}`;

/**
 * GET /report/url/:id
 *
 * @param id       - Report document ID
 * @param type     - Optional report type filter (e.g. "calibration")
 * @param download - When true, the server returns a download disposition
 */
export const EP_REPORT_URL = (
  id: string,
  type?: string,
  download?: boolean,
) => {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (download) params.set("download", "true");
  const qs = params.toString();
  return qs ? `/report/url/${id}?${qs}` : `/report/url/${id}`;
};

// ── Calibration Reports ────────────────────────────────────────────────────

/** GET /calibration-report */
export const EP_CALIBRATION_REPORTS = () => `/calibration-report` as const;

/** GET /calibration-report/:reportId */
export const EP_CALIBRATION_REPORT_BY_ID = (reportId: string) =>
  `/calibration-report/${reportId}`;

/** POST /calibration-report */
export const EP_CREATE_CALIBRATION_REPORT = () =>
  `/calibration-report` as const;

/** PUT /calibration-report/:reportId */
export const EP_UPDATE_CALIBRATION_REPORT = (reportId: string) =>
  `/calibration-report/${reportId}`;

/** DELETE /calibration-report/:reportId */
export const EP_DELETE_CALIBRATION_REPORT = (reportId: string) =>
  `/calibration-report/${reportId}`;

/** PATCH /calibration-report/:reportId/status */
export const EP_VERIFY_REJECT_CALIBRATION = (reportId: string) =>
  `/calibration-report/${reportId}/status`;

/** GET /calibration-report/:reportId/history */
export const EP_CALIBRATION_AUDIT_LOG = (reportId: string) =>
  `/calibration-report/${reportId}/history`;

/** POST /calibration-report/compute */
export const EP_COMPUTE_CALIBRATION = () =>
  `/calibration-report/compute` as const;

/** GET /calibration-report/check-csr — uniqueness check for CSR No */
export const EP_CHECK_CSR_NO = () =>
  `/calibration-report/check-csr` as const;


export const EP_EQUIPMEMTS = () => `/equipments`
export const EP_EQUIPMENTS_PARAMS_SUMMARY = () => `/equipments/params-summary`

/** PATCH /equipments/:id/active — body `{ isActive: boolean }` */
export const EP_EQUIPMENT_ACTIVE = (id: string | number) =>
  `/equipments/${id}/active` as const;

/** GET /equipments/:id/history — audit log entries */
export const EP_EQUIPMENT_HISTORY = (id: string | number) =>
  `/equipments/${id}/history` as const;

// ── Instruments (DUC instrument master) ────────────────────────────────────

/** GET /instruments  |  POST /instruments */
export const EP_INSTRUMENTS = () => `/instruments` as const;

/** GET /instruments/:id  |  PUT /instruments/:id  |  DELETE /instruments/:id */
export const EP_INSTRUMENT_BY_ID = (id: string | number) =>
  `/instruments/${id}` as const;

/** PATCH /instruments/:id/active — body `{ isActive: boolean }` */
export const EP_INSTRUMENT_ACTIVE = (id: string | number) =>
  `/instruments/${id}/active` as const;

/** GET /instruments/:id/history — audit log entries */
export const EP_INSTRUMENT_HISTORY = (id: string | number) =>
  `/instruments/${id}/history` as const;
// ── Support / Help ─────────────────────────────────────────────────────────

/** POST /support — submit a support message */
export const EP_SUPPORT_SUBMIT = () => `/support` as const;

/** GET /support/my — current user's messages */
export const EP_SUPPORT_MY = () => `/support/my` as const;

/** GET /support/all — all messages (admin) */
export const EP_SUPPORT_ALL = () => `/support/all` as const;

/** PATCH /support/:id/seen — admin marks message as seen */
export const EP_SUPPORT_SEEN = (id: string) => `/support/${id}/seen` as const;

/** POST /support/:id/reply — admin reply */
export const EP_SUPPORT_REPLY = (id: string) => `/support/${id}/reply` as const;

/** GET /dashboard */
export const EP_DASHBOARD = () => "/dashboard" as const;

// ── Legacy namespace export ────────────────────────────────────────────────
// Keeps existing call-sites working while the codebase is migrated to the
// named exports above.  Remove once all imports are updated.

/** @deprecated Use the named EP_* exports instead. */
export const ENDPOINTS = {
  LOGIN:                            EP_LOGIN,
  REGISTER:                         EP_REGISTER,
  GET_LOGGED_USER:                  EP_USER_PROFILE,
  UPDATE_PROFILE:                   EP_USER_PROFILE,
  GET_REPORTS:                      EP_REPORTS,
  GET_DRAFTS:                       EP_DRAFTS,
  GET_DRAFT_BY_ID:                  EP_DRAFT_BY_ID,
  CHANGE_REPORT_DRAFT:              EP_CHANGE_REPORT_DRAFT,
  CHANGE_REPORT_STATUS:             EP_CHANGE_REPORT_STATUS,
  DELETE_DRAFT:                     EP_DELETE_DRAFT,
  GET_REPORT_URL:                   EP_REPORT_URL,
  GET_CALIBRATION_REPORTS:          EP_CALIBRATION_REPORTS,
  GET_CALIBRATION_REPORTS_BY_ID:    EP_CALIBRATION_REPORT_BY_ID,
  CREATE_CALIBRATION_REPORT:        EP_CREATE_CALIBRATION_REPORT,
  UPDATE_CALIBRATION_REPORT:        EP_UPDATE_CALIBRATION_REPORT,
  DELETE_CALIBRATION_REPORT:        EP_DELETE_CALIBRATION_REPORT,
  VERIFY_REJECT_CALIBRATION_REPORT: EP_VERIFY_REJECT_CALIBRATION,
  GET_CALIBRATION_AUDIT_LOG:        EP_CALIBRATION_AUDIT_LOG,
  COMPUTE_CALIBRATION_PREVIEW:      EP_COMPUTE_CALIBRATION,
  GET_EQUIPMENTS:  EP_EQUIPMEMTS
} as const;
