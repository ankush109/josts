import Redis from "ioredis";
import puppeteer from "puppeteer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { connectDB } from "./db/connection.js";
import Report from "./db/models/report.js";
import CalibrationReport from "./db/models/calibration.js";
import "./db/models/user.js";
import path from "path";
import fs from "fs";
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

function mapCalibrationToTemplateData(report, instIndex = 0) {
  const inst = report.instruments?.[instIndex] ?? {};
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
   logoUrl: (() => {
      try {
        const buf = fs.readFileSync(path.join(process.cwd(), "logo2.png"));
        return `data:image/png;base64,${buf.toString("base64")}`;
      } catch { return ""; }
    })(),

    qrUrl: (() => {
  try {
    const filePath = path.join(process.cwd(), "qr.png");
    console.log("Looking for QR at:", filePath, "exists:", fs.existsSync(filePath));
    const buf = fs.readFileSync(filePath);
    console.log("QR loaded, size:", buf.length, "bytes");
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch (err) {
    console.error("QR load failed:", err.message);
    return "";
  }
})(),

    certificateNo:          report.certNo || report.csrNo || "",
    certificateIssueDate:   formatDate(report.createdAt),
    totalPages:             "2",

    ducReceivedDate:        formatDate(report.ducReceivedDate),
    dateOfCalibration:      formatDate(report.dateOfCalibration || inst.calDate),
    calibrationDueDate:     formatDate(report.calibrationDueDate),
    customerReferenceNo:    report.customerRefNo ?? "",
    customerName:           report.customerName ?? "",
    customerAddress:        report.customerAddress ?? "",

    ducName:                inst.nomenclature ?? "",
    ducSerialNo:            inst.slNo ?? "",
    ducMake:                inst.make ?? "",
    ducModel:               inst.modelType ?? "",
    ducRange:               "As Per Instrument Spec.",
    accuracy:               "As per Manufacturer's Specification",
    conditionOfItem:        "Satisfactory",
    locationOfCalibration:  report.calibrationLocation === "onsite" ? "At Site" : "At Lab",

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

    calibratedByName: report.signatures?.calibratedBy?.signatureName || report.signatures?.calibratedBy?.name || "",
    calibratedByRole: "Calibration Engineer",
    approvedByName:   report.signatures?.verifiedBy?.signatureName   || report.signatures?.verifiedBy?.name   || "",
    approvedByRole:   "Technical/Quality Manager",
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

  const s3Key = `reports/${report.title}.pdf`;
  await uploadToS3(pdfBuffer, s3Key);

  await Report.findByIdAndUpdate(reportId, { status: "uploaded", filePath: s3Key });
  console.log(`Done: ${s3Key}`);
}

async function handleCalibrationJob(reportId) {
  const report = await CalibrationReport.findById(reportId)
    .populate("signatures.calibratedBy", "name signatureName")
    .populate("signatures.verifiedBy",   "name signatureName")
    .lean();
  if (!report) {
    console.warn(`CalibrationReport ${reportId} not found, skipping`);
    return;
  }

  console.log("[cal-job] report fields:", JSON.stringify({
    csrNo:               report.csrNo,
    certNo:              report.certNo,
    customerName:        report.customerName,
    customerAddress:     report.customerAddress,
    customerRefNo:       report.customerRefNo,
    ducReceivedDate:     report.ducReceivedDate,
    dateOfCalibration:   report.dateOfCalibration,
    calibrationDueDate:  report.calibrationDueDate,
    calibrationLocation: report.calibrationLocation,
  }, null, 2));

  const templatePath = path.join(process.cwd(), "templates", "electrical-calibration.ejs");
  const instruments  = report.instruments?.length ? report.instruments : [{}];
  const filePaths    = [];

  for (let i = 0; i < instruments.length; i++) {
    const data      = mapCalibrationToTemplateData(report, i);
    const html      = await renderTemplate(templatePath, data);
    const pdfBuffer = await createPdfBuffer(html);
    const suffix    = instruments.length > 1 ? `_${i + 1}` : "";
    const s3Key     = `calibration/${reportId}_${report.csrNo}${suffix}.pdf`;
    await uploadToS3(pdfBuffer, s3Key);
    filePaths.push(s3Key);
  }

  await CalibrationReport.findByIdAndUpdate(reportId, { filePaths });
  console.log(`Done: ${filePaths.join(", ")}`);
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
