// One-time script: populate acc90Day / acc1Year formula fields for Fluke 5502A
import "dotenv/config";
import mongoose from "mongoose";
import { readFileSync } from "fs";

const LOOKUP_PATH = "/tmp/fluke5502a-formula-lookup.json";
const EQUIPMENT_ID_NO = "JECL/KOL/MPC-01";

const lookup = JSON.parse(readFileSync(LOOKUP_PATH, "utf8"));

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;
const col = db.collection("equipment");

const doc = await col.findOne({ idNo: EQUIPMENT_ID_NO });
if (!doc) {
  console.error("Equipment not found:", EQUIPMENT_ID_NO);
  process.exit(1);
}

let updated = 0;
let skipped = 0;

const params = doc.parameters.map((p) => {
  const key = `${p.parameterName}|${p.range}|${p.unit}`;
  const entry = lookup[key];
  if (!entry) {
    skipped++;
    return p;
  }
  updated++;
  return {
    ...p,
    acc90DayPct: entry.acc90DayPct,
    acc90DayFloor: entry.acc90DayFloor,
    acc90DayFloorUnit: entry.acc90DayFloorUnit,
    acc1YearPct: entry.acc1YearPct ?? null,
    acc1YearFloor: entry.acc1YearFloor ?? null,
    acc1YearFloorUnit: entry.acc1YearFloorUnit ?? null,
  };
});

await col.updateOne({ idNo: EQUIPMENT_ID_NO }, { $set: { parameters: params } });

console.log(`Done. Updated: ${updated}, Skipped (no match): ${skipped}`);
await mongoose.disconnect();
