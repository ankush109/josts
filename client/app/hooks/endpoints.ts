

export const ENDPOINTS = {
  LOGIN:                      ()                              => `/auth/login`,
  REGISTER:                   ()                              => `/auth/register`,
  GET_LOGGED_USER:            ()                              => `/user/profile`,
  UPDATE_PROFILE:             ()                              => `/user/profile`,
  GET_REPORTS:                (id?: string | number)          => id ? `/report/${id}` : `/report`,
  GET_DRAFTS:                 ()                              => `/report/drafts/all`,
  GET_DRAFT_BY_ID:            (reportId: string | number)    => `/report/drafts/${reportId}`,
  CHANGE_REPORT_DRAFT:        (reportId: string | number)    => `/report/${reportId}/draft`,
  CHANGE_REPORT_STATUS:       (reportId: string | number, status: string) => `/report/${reportId}/${status}`,
  DELETE_DRAFT:               (reportId: string | number)    => `/report/${reportId}`,

  GET_REPORT_URL:             (id: string, type?: string, download?: boolean) => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (download) params.set("download", "true");
    const qs = params.toString();
    return qs ? `/report/url/${id}?${qs}` : `/report/url/${id}`;
  },
  GET_CALIBRATION_REPORTS:    ()                             => `/calibration-report`,
  GET_CALIBRATION_REPORTS_BY_ID: (reportId: string)         => `/calibration-report/${reportId}`,
  CREATE_CALIBRATION_REPORT:  ()                             => `/calibration-report`,
  UPDATE_CALIBRATION_REPORT:  (reportId: string)            => `/calibration-report/${reportId}`,
  DELETE_CALIBRATION_REPORT:          (reportId: string) => `/calibration-report/${reportId}`,
  VERIFY_REJECT_CALIBRATION_REPORT:   (reportId: string) => `/calibration-report/${reportId}/status`,
  GET_CALIBRATION_AUDIT_LOG:          (reportId: string) => `/calibration-report/${reportId}/history`,
  COMPUTE_CALIBRATION_PREVIEW:        ()                 => `/calibration-report/compute`,
};
