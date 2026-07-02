/**
 * Rename parameter names for VCM100, VCM100D, PICTS 2000-2, and Smrt46
 * so they match the calibration form's canonical PARAM_TYPES.
 *
 * Run: node scripts/patchParamNames.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Map old → new for each idNo
const PATCHES = {
  "JECL/KOL/VCM-01": {
    "AC High Voltage @ 50 Hz": "AC Voltage @ 50 Hz",
  },
  "JECL/KOL/VCMD-01": {
    "AC High Voltage @ 50 Hz": "AC Voltage @ 50 Hz",
  },
  "JECL/KOL/ODEN-01": {
    "AC High Current @ 50 Hz": "AC Current @ 50 Hz",
  },
  "JECL/KOL/SMRT-01": {
    "ACV @ 50 Hz":            "AC Voltage @ 50 Hz",
    "ACA @ 50 Hz":            "AC Current @ 50 Hz",
    "AC High Current @ 50 Hz": "AC Current @ 50 Hz",
  },
};

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const col = mongoose.connection.db.collection("equipment");

  for (const [idNo, nameMap] of Object.entries(PATCHES)) {
    const doc = await col.findOne({ idNo });
    if (!doc) { console.log(`  SKIP — not found: ${idNo}`); continue; }

    const patched = (doc.parameters ?? []).map((p) => ({
      ...p,
      parameterName: nameMap[p.parameterName] ?? p.parameterName,
    }));

    await col.updateOne({ _id: doc._id }, { $set: { parameters: patched } });

    const renames = Object.entries(nameMap)
      .map(([from, to]) => `"${from}" → "${to}"`)
      .join(", ");
    console.log(`  ${doc.equipmentName} (${idNo}): ${patched.length} params | renamed: ${renames}`);
  }

  console.log("\nDone.");
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
