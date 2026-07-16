import mongoose from "mongoose";
import dotenv   from "dotenv";
import FormulaConfig from "../src/models/FormulaConfig.js";

dotenv.config();

const DEFAULT_CONFIG = {
  name:        "Default GUM (ISO/IEC 17025)",
  description: "Standard GUM uncertainty budget formulas per ISO/IEC 17025. J and K are computed statistically from readings; M–W are evaluated via mathjs.",
  isActive:    true,
  formulas: [
    {
      symbol:      "J",
      label:       "Mean Value",
      columnName:  "Mean Value",
      formula:     "mean(readings)",
      description: "Arithmetic mean of observed readings — computed in JS from raw readings array",
      editable:    false,
    },
    {
      symbol:      "K",
      label:       "Std. U/c of Mean",
      columnName:  "Std. U/c of Mean",
      formula:     "std(readings) / sqrt(n)",
      description: "Type A standard uncertainty (Bessel-corrected std dev of mean) — computed in JS",
      editable:    false,
    },
    {
      symbol:      "M",
      label:       "Std. Uncertainty",
      columnName:  "Std. Uncertainty",
      formula:     "stdUncPct / 100 * absNom",
      description: "Standard uncertainty derived from the reference standard certificate uncertainty%",
      editable:    true,
    },
    {
      symbol:      "N",
      label:       "U/c of Ref. Std.",
      columnName:  "U/c of Ref. Std.",
      formula:     "M / 2",
      description: "Uncertainty of the reference standard (expanded / coverage factor 2)",
      editable:    true,
    },
    {
      symbol:      "O",
      label:       "U/c due to Acc. of Ref.",
      columnName:  "U/c due to Acc. of Ref.",
      formula:     "(refAccPct / 100 * absNom + refAccFloor) / sqrt(3)",
      description: "Type B uncertainty due to OEM 1-year accuracy spec of reference standard (rectangular distribution)",
      editable:    true,
    },
    {
      symbol:      "P",
      label:       "U/c due to L/c of DUC",
      columnName:  "U/c due to L/c of DUC",
      formula:     "leastCount / (2 * sqrt(3))",
      description: "Type B uncertainty due to the least count / resolution of the DUC (rectangular distribution)",
      editable:    true,
    },
    {
      symbol:      "Q",
      label:       "Combined Uc",
      columnName:  "Combined Uc",
      formula:     "sqrt(K^2 + N^2 + O^2 + P^2)",
      description: "Combined standard uncertainty (root-sum-of-squares of all components)",
      editable:    true,
    },
    {
      symbol:      "R",
      label:       "Effective DoF",
      columnName:  "Effective DoF",
      formula:     "4 * Q^4 / K^4",
      description: "Welch-Satterthwaite effective degrees of freedom",
      editable:    true,
    },
    {
      symbol:      "S",
      label:       "k Factor",
      columnName:  "k Factor",
      formula:     "tinv(R)",
      description: "Coverage factor k from t-distribution at 95% two-tailed confidence",
      editable:    true,
    },
    {
      symbol:      "T",
      label:       "Expanded Uncertainty",
      columnName:  "Expanded Uncertainty",
      formula:     "S * Q",
      description: "Expanded uncertainty U = k × Uc",
      editable:    true,
    },
    {
      symbol:      "V",
      label:       "Resulted Expanded U/C",
      columnName:  "Resulted Expanded U/C",
      formula:     "T",
      description: "Resulted expanded uncertainty (equals T)",
      editable:    true,
    },
    {
      symbol:      "W",
      label:       "% U/C",
      columnName:  "% U/C",
      formula:     "V / absNom * 100",
      description: "Expanded uncertainty expressed as a percentage of the nominal value",
      editable:    true,
    },
  ],
};

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const existing = await FormulaConfig.findOne({ name: DEFAULT_CONFIG.name });
  if (existing) {
    console.log(`Formula config "${DEFAULT_CONFIG.name}" already exists — skipping.`);
    await mongoose.disconnect();
    return;
  }

  // Deactivate any currently active configs before inserting the new default
  await FormulaConfig.updateMany({ isActive: true }, { $set: { isActive: false } });

  const doc = await FormulaConfig.create({
    ...DEFAULT_CONFIG,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`Seeded formula config: "${doc.name}" (id=${doc._id})`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
