import puppeteer from "puppeteer";
import ejs from "ejs";
import { PDF_OPTIONS } from "../config.js";
import logger from "./logger.js";

const log = logger("pdf");

/**
 * Renders an EJS template file with the supplied data object.
 *
 * @param {string} templatePath - Absolute path to the `.ejs` file.
 * @param {object} data         - Variables passed into the template.
 * @returns {Promise<string>}   Rendered HTML string.
 */
export function renderTemplate(templatePath, data) {
  return new Promise((resolve, reject) => {
    ejs.renderFile(templatePath, data, { async: false }, (err, html) => {
      if (err) reject(err);
      else resolve(html);
    });
  });
}

/**
 * Renders an HTML string to a PDF buffer using Puppeteer.
 * The browser is always closed — even if rendering throws.
 *
 * @param {string} html - Full HTML document to render.
 * @returns {Promise<Buffer>} PDF file contents.
 */
export async function renderHtmlToPdf(html) {
  log.debug("launching browser");
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf(PDF_OPTIONS);
    log.debug("pdf rendered", { bytes: pdf.length });
    return pdf;
  } finally {
    await browser.close();
  }
}
