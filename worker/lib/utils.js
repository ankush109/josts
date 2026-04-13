import fs from "fs";
import path from "path";

/**
 * Reads a local image file and returns a base64 data URI suitable for
 * embedding directly in HTML.
 * Returns an empty string silently if the file cannot be read.
 *
 * @param {string} filename - Filename relative to `process.cwd()`.
 * @returns {string} `data:<mime>;base64,<data>`, or `""` on failure.
 */
export function readImageAsBase64(filename) {
  try {
    const buf  = fs.readFileSync(path.join(process.cwd(), filename));
    const mime = path.extname(filename).slice(1).toLowerCase();
    return `data:image/${mime};base64,${buf.toString("base64")}`;
  } catch {
    return "";
  }
}

/**
 * Formats a date value as `DD/MM/YYYY` using the `en-IN` locale.
 * Returns an empty string for any falsy input.
 *
 * @param {Date|string|number|null|undefined} value
 * @returns {string}
 */
export function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

/**
 * Builds the S3 object key for a calibration certificate PDF.
 *
 * @param {string} csrNo      - Report CSR number.
 * @param {object} instrument - `{ make?: string, modelType?: string }`.
 * @param {number} index      - Instrument's position within the report (0-based).
 * @param {number} total      - Total number of instruments in the report.
 * @returns {string} e.g. `"calibration/CSR001_Fluke_87V_2.pdf"`
 */
export function buildCalibrationS3Key(csrNo, instrument, index, total) {
  const instName = [instrument.make, instrument.modelType]
    .filter(Boolean)
    .join("_")
    .replace(/\s+/g, "_");
  const suffix = total > 1 ? `_${index + 1}` : "";
  return `calibration/${csrNo}${instName ? `_${instName}` : ""}${suffix}.pdf`;
}
