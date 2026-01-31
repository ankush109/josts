

export const ENDPOINTS = {

  LOGIN: () => `/auth/login`,
  REGISTER : () => `/auth/register`,
  GET_LOGGED_USER : () => `/user/profile`,
  GET_REPORTS: (id?: string | number) => (id ? `/report/${id}` : `/report`),
  GET_DRAFTS : () => `/report/drafts/all`,
  GET_DRAFT_BY_ID : (reportId: string | number) => `/report/drafts/${reportId}`,
  CHANGE_REPORT_DRAFT : (reportId: string | number) => `/report/${reportId}/draft`,
  CHANGE_REPORT_STATUS : (reportId: string | number, status:string) => `/report/${reportId}/${status}`,
  DELETE_DRAFT : (reportId: string | number) => `/report/${reportId}`,

  
};
