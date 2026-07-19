/**
 * Shared constants used across the worker.
 * Centralising them here avoids magic strings scattered through the codebase.
 */

/** Redis queue name the worker blocks on. */
export const QUEUE_NAME = "pdf_jobs";

/** Puppeteer PDF render options applied to every generated certificate. */
export const PDF_OPTIONS = { format: "A4", printBackground: true };

/**
 * Static strings written onto every calibration certificate.
 * These never vary between reports, so they live here rather than in the
 * template-data builder.
 */
export const CERT_DEFAULTS = {
  ducRange:               "As Per Instrument Spec.",
  accuracy:               "As per Manufacturer's Specification",
  conditionOfItem:        "Satisfactory",
  recommendedTemp:        "25±4 °C",
  recommendedHumidity:    "55±15 %",
  methodOfCalibration:    "Direct Method",
  descriptionOfStandards: "Traceable to National / International Standards",
  calibrationType:        "Electro - Technical Calibration",
  calibratedByRole:       "Calibration Engineer",
  approvedByRole:         "Technical/Quality Manager",
  totalPages:             "2",
};

/**
 * Base URL of the client app — QR codes on generated PDFs encode
 * `<PUBLIC_APP_URL>/calibration/<reportId>` so scanning takes you to the
 * report. Falls back to production if not set.
 */
export const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || "https://jost-client-acm8.vercel.app";

/**
 * Address + NABL data per letterhead variant. `showQr` flags whether a
 * report QR is rendered; `nablCertNo` marks NABL-accredited headers so the
 * badge shows.
 */
export const LETTER_HEAD_VARIANTS = {
  kol: {
    address:    "19, British Indian Street, Kolkata 700 069, West Bengal, India.",
    showQr:     false,
    nablCertNo: "",
  },
  kol_nabl: {
    address:    "19 A, Abdul Hamid Street, Kolkata-700069, WB",
    showQr:     true,
    nablCertNo: "NABLC0526WB04743",
  },
  del_non_nabl: {
    address:    "Unit #708 709, 7th Floor, Gopal Heights, New Delhi - 110034",
    showQr:     true,
    nablCertNo: "",
  },
};
