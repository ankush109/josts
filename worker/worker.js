import Redis from "ioredis";
import puppeteer from "puppeteer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { connectDB } from "./db/connection.js";
import Report from "./db/models/report.js";
import CalibrationReport from "./db/models/calibration.js";
import path from "path";
import ejs from "ejs";

dotenv.config({ path: new URL(".env", import.meta.url).pathname });

// ─── Redis ───────────────────────────────────────────────────────────────────

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

// ─── S3 ──────────────────────────────────────────────────────────────────────

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function renderTemplate(templatePath, data) {
  return new Promise((resolve, reject) => {
    ejs.renderFile(templatePath, data, { async: false }, (err, str) => {
      if (err) reject(err);
      else resolve(str);
    });
  });
}

async function createPdfBuffer(html) {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
  await browser.close();
  return pdfBuffer;
}

async function uploadToS3(buffer, key) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "application/pdf",
    })
  );
}

// ─── Calibration data → template variables ───────────────────────────────────

function formatDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function mapCalibrationToTemplateData(report) {
  const inst = report.instruments?.[0] ?? {};
  const ref  = inst.refStandard ?? {};

  const calibrationResults = (inst.parameters ?? []).map((param) => ({
    parameter: param.name,
    ranges: (param.ranges ?? []).map((range) => ({
      label: range.label,
      rows: (range.measurements ?? []).map((m) => ({
        standardValue:       m.nomValue ?? "",
        standardUnit:        param.unit ?? "",
        ducValue:            m.computed?.meanValue != null ? Number(m.computed.meanValue).toFixed(4) : "",
        ducUnit:             param.unit ?? "",
        errorValue:          m.computed?.error != null ? Number(m.computed.error).toFixed(4) : "",
        errorUnit:           param.unit ?? "",
        expandedUncertainty: m.computed?.percentUc != null ? Number(m.computed.percentUc).toFixed(4) : "",
      })),
    })),
  }));

  return {
    certificateNo:          report.csrNo ?? "",
    certificateIssueDate:   formatDate(report.createdAt),
    totalPages:             "2",

    ducReceivedDate:        "",
    dateOfCalibration:      formatDate(inst.calDate),
    calibrationDueDate:     "",
    customerReferenceNo:    "",
    customerAddress:        "",

    ducName:                inst.nomenclature ?? "",
    ducSerialNo:            inst.slNo ?? "",
    ducMake:                inst.make ?? "",
    ducModel:               inst.modelType ?? "",
    ducRange:               "As Per Instrument Spec.",
    accuracy:               "As per Manufacturer's Specification",
    conditionOfItem:        "Satisfactory",
    locationOfCalibration:  "At Site",

    recommendedTemp:        "25±4 °C",
    recommendedHumidity:    "55±15 %",
    duringCalibrationTemp:  inst.environmental?.temperature ?? "",
    duringCalibrationHumidity: inst.environmental?.humidity ?? "",

    calibrationProcedure:   "",
    methodOfCalibration:    "Direct Method",
    descriptionOfStandards: "Traceable to National / International Standards",

    referenceStandards: ref.name ? [
      {
        name:                ref.name,
        makeModel:           [ref.make, ref.modelType].filter(Boolean).join(" / "),
        validUpto:           formatDate(ref.calDueDate),
        traceabilityCertNo:  ref.traceability ?? "",
        idNo:                "",
        srNo:                ref.srNo ?? "",
      },
    ] : [],

    calibrationType:    "Electro - Technical Calibration",
    calibrationResults,
  };
}

// ─── Job handlers ─────────────────────────────────────────────────────────────

async function handleReportJob(reportId) {
  const report = await Report.findById(reportId);
  if (!report) {
    console.warn(`Report ${reportId} not found, skipping`);
    return;
  }

  const template     = report.payload?.template || "safe.ejs";
  const templatePath = path.join(process.cwd(), "templates", template);
  const html         = await renderTemplate(templatePath, report.payload);
  const pdfBuffer    = await createPdfBuffer(html);

  const s3Key = `reports/${reportId}_${report.title}.pdf`;
  await uploadToS3(pdfBuffer, s3Key);

  await Report.findByIdAndUpdate(reportId, { status: "uploaded", filePath: s3Key });
  console.log(`Done: ${s3Key}`);
}

async function handleCalibrationJob(reportId) {
  const report = await CalibrationReport.findById(reportId).lean();
  if (!report) {
    console.warn(`CalibrationReport ${reportId} not found, skipping`);
    return;
  }

  const templatePath = path.join(process.cwd(), "templates", "electrical-calibration.ejs");
  const data         = mapCalibrationToTemplateData(report);
  const html         = await renderTemplate(templatePath, data);
  const pdfBuffer    = await createPdfBuffer(html);

  const s3Key = `calibration/${reportId}_${report.csrNo}.pdf`;
  await uploadToS3(pdfBuffer, s3Key);

  await CalibrationReport.findByIdAndUpdate(reportId, { filePath: s3Key });
  console.log(`Done: ${s3Key}`);
}

// ─── Worker loop ──────────────────────────────────────────────────────────────

console.log("Worker started, waiting for jobs…");

(async function runWorker() {
  await connectDB();

  while (true) {
    const [, rawJob] = await redis.brpop("pdf_jobs", 0);
    const job = JSON.parse(rawJob);
    const { jobId, reportId, type = "report" } = job;

    console.log(`Processing job ${jobId} | type=${type} | reportId=${reportId}`);

    try {
      if (type === "calibration") {
        await handleCalibrationJob(reportId);
      } else {
        await handleReportJob(reportId);
      }
    } catch (err) {
      console.error(`Job ${jobId} failed:`, err.message);
    }
  }
})();
