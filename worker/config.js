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
