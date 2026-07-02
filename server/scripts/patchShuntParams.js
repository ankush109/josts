/**
 * Patch all DC Current Shunt equipment records:
 *  1. Rename parameterName "DC High Current" → "DC Current"
 *  2. Rename parameterName "AC High Current @ 50 Hz" → "AC Current @ 50 Hz"
 *  3. Set acc90DayPct = acc1YearPct = 0.5, floor = 0 for every parameter row
 *     (OEM accuracy: ±0.5% fixed, from Josts_OEM_Accuracy_v7_6.xlsx)
 *
 * Run: node scripts/patchShuntParams.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const PARAM_NAME_MAP = {
  "DC High Current":        "DC Current",
  "AC High Current @ 50 Hz": "AC Current @ 50 Hz",
};

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  const col = db.collection("equipment");

  // All shunt documents (matched by model field)
  const shunts = await col
    .find({ model: { $regex: /^Shunt \(/i } })
    .toArray();

  console.log(`Found ${shunts.length} shunt document(s)`);

  let totalUpdated = 0;

  for (const shunt of shunts) {
    const params = shunt.parameters ?? [];
    let changed = false;

    const patchedParams = params.map((p) => {
      const newName = PARAM_NAME_MAP[p.parameterName] ?? p.parameterName;
      const renamed = newName !== p.parameterName;
      if (renamed) changed = true;

      return {
        ...p,
        parameterName: newName,
        acc90DayPct:      0.5,
        acc90DayFloor:    0,
        acc90DayFloorUnit: "",
        acc1YearPct:      0.5,
        acc1YearFloor:    0,
        acc1YearFloorUnit: "",
      };
    });

    await col.updateOne(
      { _id: shunt._id },
      { $set: { parameters: patchedParams } }
    );

    const renames = params
      .filter((p) => PARAM_NAME_MAP[p.parameterName])
      .map((p) => `"${p.parameterName}" → "${PARAM_NAME_MAP[p.parameterName]}"`)
      .filter((v, i, a) => a.indexOf(v) === i);

    console.log(`  ${shunt.equipmentName} (${shunt.idNo}): ${params.length} params patched${renames.length ? " | renamed: " + renames.join(", ") : ""}`);
    totalUpdated++;
  }

  console.log(`\nDone. ${totalUpdated} shunt document(s) updated.`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
