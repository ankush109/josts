/**
 * @file seedTemplates.js
 * @description Seeds the Template collection from the on-disk .ejs files in
 *              the worker repo. Creates v1 only when no version exists for
 *              the given key — re-running is safe and will never overwrite
 *              admin-authored versions.
 *
 * Run with: node scripts/seedTemplates.js
 */

import fs       from "fs";
import path     from "path";
import mongoose from "mongoose";
import dotenv   from "dotenv";

import { Template, TemplateVersion } from "../src/models/Template.js";

dotenv.config();

const SEEDS = [
  {
    key:         "calibration-certificate",
    name:        "Calibration Certificate",
    description: "Rendered for every non-draft calibration report.",
    file:        path.resolve(process.cwd(), "../worker/templates/electrical-calibration.ejs"),
  },
];

async function seedOne({ key, name, description, file }) {
  if (!fs.existsSync(file)) {
    console.warn(`[seed] file not found, skipping ${key}: ${file}`);
    return;
  }
  const body = fs.readFileSync(file, "utf8");

  let tpl = await Template.findOne({ key });
  if (!tpl) {
    tpl = await Template.create({ key, name, description });
    console.log(`[seed] created template ${key}`);
  }

  const existing = await TemplateVersion.findOne({ templateKey: key }).select("_id versionNumber").lean();
  if (existing) {
    console.log(`[seed] ${key} already has versions (v${existing.versionNumber}+), skipping body import`);
    return;
  }

  const version = await TemplateVersion.create({
    templateKey:   key,
    versionNumber: 1,
    body,
    note:          "Seeded from worker/templates",
  });
  tpl.activeVersionId = version._id;
  await tpl.save();
  console.log(`[seed] ${key} → v1 created and activated (${body.length} chars)`);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  try {
    for (const seed of SEEDS) await seedOne(seed);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
