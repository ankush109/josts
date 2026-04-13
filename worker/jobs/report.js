import path from "path";
import Report from "../db/models/report.js";
import { renderTemplate, renderHtmlToPdf } from "../lib/pdf.js";
import { uploadPdfToS3 } from "../lib/s3.js";
import logger from "../lib/logger.js";

const log = logger("report");

/**
 * Processes a generic report PDF job.
 *
 * Renders the report's EJS template, converts the HTML to a PDF, uploads it
 * to S3, and marks the report document as `"uploaded"`.
 *
 * @param {string} reportId - MongoDB `_id` of the `Report` document.
 * @returns {Promise<void>}
 */
export async function handleReportJob(reportId) {
  log.info("processing job", { reportId });

  const report = await Report.findById(reportId);
  if (!report) {
    log.warn("report not found — skipping", { reportId });
    return;
  }

  const template     = report.payload?.template || "safe.ejs";
  const templatePath = path.join(process.cwd(), "templates", template);
  log.debug("rendering template", { template });

  const html  = await renderTemplate(templatePath, report.payload);
  const pdf   = await renderHtmlToPdf(html);
  const s3Key = `reports/${report.title}.pdf`;

  await uploadPdfToS3(pdf, s3Key);
  await Report.findByIdAndUpdate(reportId, { status: "uploaded", filePath: s3Key });

  log.info("job complete", { reportId, s3Key });
}
