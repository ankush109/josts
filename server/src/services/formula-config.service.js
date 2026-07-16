import mongoose from "mongoose";
import FormulaConfig from "../models/FormulaConfig.js";
import { evaluateChain } from "../utils/formula-evaluator.js";

function assertValidId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error("Invalid formula config ID");
    err.statusCode = 400;
    throw err;
  }
}

export async function listFormulaConfigs() {
  return FormulaConfig.find().sort({ createdAt: -1 }).lean();
}

export async function getFormulaConfigById(id) {
  assertValidId(id);
  const doc = await FormulaConfig.findById(id).lean();
  if (!doc) {
    const err = new Error("Formula config not found");
    err.statusCode = 404;
    throw err;
  }
  return doc;
}

export async function getActiveFormulaConfig() {
  return FormulaConfig.findOne({ isActive: true }).lean();
}

export async function createFormulaConfig(payload, userId) {
  const { name, description, formulas } = payload;

  if (!name?.trim()) {
    const err = new Error("name is required");
    err.statusCode = 400;
    throw err;
  }

  const doc = await FormulaConfig.create({
    name:        name.trim(),
    description: description ?? "",
    isActive:    false,
    formulas:    formulas ?? [],
    createdBy:   userId,
    createdAt:   new Date(),
    updatedAt:   new Date(),
  });

  return doc.toObject();
}

export async function updateFormulaConfig(id, payload, userId) {
  assertValidId(id);

  const existing = await FormulaConfig.findById(id);
  if (!existing) {
    const err = new Error("Formula config not found");
    err.statusCode = 404;
    throw err;
  }

  const { name, description, formulas } = payload;
  if (name !== undefined) existing.name = name.trim();
  if (description !== undefined) existing.description = description;
  if (formulas !== undefined) existing.formulas = formulas;
  existing.updatedAt = new Date();

  await existing.save();
  return existing.toObject();
}

export async function activateFormulaConfig(id) {
  assertValidId(id);

  const doc = await FormulaConfig.findById(id);
  if (!doc) {
    const err = new Error("Formula config not found");
    err.statusCode = 404;
    throw err;
  }

  await FormulaConfig.updateMany({ _id: { $ne: id } }, { $set: { isActive: false, updatedAt: new Date() } });
  doc.isActive  = true;
  doc.updatedAt = new Date();
  await doc.save();

  return doc.toObject();
}

export async function testFormulaConfig(id, sampleInputs) {
  assertValidId(id);

  const doc = await FormulaConfig.findById(id).lean();
  if (!doc) {
    const err = new Error("Formula config not found");
    err.statusCode = 404;
    throw err;
  }

  const baseScope = {
    nomValue:    sampleInputs.nomValue    ?? 0,
    absNom:      Math.abs(sampleInputs.nomValue ?? 0),
    n:           sampleInputs.n           ?? 1,
    J:           sampleInputs.J           ?? sampleInputs.nomValue ?? 0,
    K:           sampleInputs.K           ?? 0,
    stdUncPct:   sampleInputs.stdUncPct   ?? 0,
    leastCount:  sampleInputs.leastCount  ?? 0,
    refAccPct:   sampleInputs.refAccPct   ?? 0,
    refAccFloor: sampleInputs.refAccFloor ?? 0,
    ...sampleInputs,
  };

  const rawResults = evaluateChain(doc.formulas, baseScope);

  return doc.formulas.map((entry) => {
    const raw = rawResults[entry.symbol];
    if (raw && typeof raw === "object" && raw.error) {
      return { symbol: entry.symbol, label: entry.label, error: raw.error };
    }
    return { symbol: entry.symbol, label: entry.label, value: raw ?? null };
  });
}

export async function deleteFormulaConfig(id) {
  assertValidId(id);

  const doc = await FormulaConfig.findById(id).lean();
  if (!doc) {
    const err = new Error("Formula config not found");
    err.statusCode = 404;
    throw err;
  }
  if (doc.isActive) {
    const err = new Error("Cannot delete the active formula config — deactivate it first");
    err.statusCode = 400;
    throw err;
  }

  await FormulaConfig.deleteOne({ _id: id });
}
