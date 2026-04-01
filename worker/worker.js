import Redis from "ioredis";
import puppeteer from "puppeteer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { connectDB } from "./db/connection.js";
import Report from "./db/models/report.js";
import path from "path";
import ejs from "ejs";

dotenv.config();

// ─── Redis ───────────────────────────────────────────────────────────────────

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

// ─── S3 ──────────────────────────────────────────────────────────────────────

const s3 = new S3Client({ region: process.env.AWS_REGION });
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

// ─── Worker loop ──────────────────────────────────────────────────────────────

console.log("Worker started, waiting for jobs…");

(async function runWorker() {
  await connectDB();

  while (true) {
    const [, rawJob] = await redis.brpop("pdf_jobs", 0);
    const job = JSON.parse(rawJob);
    const { jobId, reportId } = job;

    console.log(`Processing job ${jobId} for report ${reportId}`);

    try {
      const report = await Report.findById(reportId);

      if (!report) {
        console.warn(`Report ${reportId} not found, skipping`);
        continue;
      }

      const templatePath = path.join(process.cwd(), "templates", "safe.ejs");
      const html = await renderTemplate(templatePath, report.payload);
      const pdfBuffer = await createPdfBuffer(html);

      const s3Key = `reports/${reportId}_${report.title}.pdf`;
      await uploadToS3(pdfBuffer, s3Key);

      await Report.findByIdAndUpdate(reportId, {
        status: "uploaded",
        filePath: s3Key,
      });

      console.log(`Done: ${s3Key}`);
    } catch (err) {
      console.error(`Job ${jobId} failed:`, err.message);
    }
  }
})();
