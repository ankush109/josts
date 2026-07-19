/**
 * @file syncCalibrationCertificateTemplate.js
 * @description Publishes the current on-disk `worker/templates/electrical-
 *              calibration.ejs` file as a NEW active TemplateVersion for the
 *              "calibration-certificate" template. Existing versions are kept
 *              intact — this just adds a new one and points activeVersionId at
 *              it, so you can roll back from the UI if needed.
 *
 * Run with: node scripts/syncCalibrationCertificateTemplate.js
 */

import fs       from "fs";
import path     from "path";
import mongoose from "mongoose";
import dotenv   from "dotenv";

import { Template, TemplateVersion } from "../src/models/Template.js";

dotenv.config();

const KEY  = "calibration-certificate";
const FILE = path.resolve(process.cwd(), "../worker/templates/electrical-calibration.ejs");
const NOTE = process.env.SYNC_NOTE || "Synced from disk (added Remarks block + End of Certificate marker).";

async function main() {
  if (!fs.existsSync(FILE)) {
    console.error(`[sync] file not found: ${FILE}`);
    process.exit(1);
  }

  const body = fs.readFileSync(FILE, "utf8");

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`[sync] connected to Mongo`);

  const tpl = await Template.findOne({ key: KEY });
  if (!tpl) {
    console.error(`[sync] no Template found with key="${KEY}". Run seedTemplates first.`);
    process.exit(1);
  }

  const latest = await TemplateVersion
    .findOne({ templateKey: KEY })
    .sort({ versionNumber: -1 })
    .select("versionNumber")
    .lean();
  const nextVersion = (latest?.versionNumber ?? 0) + 1;

  const version = await TemplateVersion.create({
    templateKey:   KEY,
    versionNumber: nextVersion,
    body,
    note:          NOTE,
  });
  console.log(`[sync] created version v${nextVersion} (${version._id})`);

  tpl.activeVersionId = version._id;
  await tpl.save();
  console.log(`[sync] activated v${nextVersion} on template ${KEY}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[sync] failed:", err);
  process.exit(1);
});
