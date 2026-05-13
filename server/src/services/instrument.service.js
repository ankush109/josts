import mongoose from "mongoose";
import Instrument from "../models/Instrument.js";
import {
  computeInstrumentDiff,
  logInstrumentAudit,
} from "./instrument-audit.service.js";

export const listInstruments = async (reqQuery) => {
  const {
    page   = 1,
    limit  = 50,
    search = "",
    status,
    sortBy = "key",
  } = reqQuery;

  const query = {};
  if (status === "true")  query.isActive = true;
  if (status === "false") query.isActive = false;
  if (search) {
    query.$or = [
      { key:       { $regex: search, $options: "i" } },
      { make:      { $regex: search, $options: "i" } },
      { modelType: { $regex: search, $options: "i" } },
    ];
  }

  const instruments = await Instrument.find(query)
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .sort({ [sortBy]: 1 })
    .lean();

  const count = await Instrument.countDocuments(query);

  return {
    success: true,
    data: instruments,
    totalPages: Math.ceil(count / limit),
    currentPage: Number(page),
    totalItems: count,
  };
};

export const getInstrumentById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error("Invalid Instrument ID format");
    err.statusCode = 400;
    throw err;
  }
  const instrument = await Instrument.findById(id).lean();
  if (!instrument) {
    const err = new Error("Instrument not found");
    err.statusCode = 404;
    throw err;
  }
  return instrument;
};

export const createInstrument = async (payload, userId) => {
  const doc = await Instrument.create({ ...payload, addedBy: userId });
  const obj = doc.toObject();
  await logInstrumentAudit({
    instrumentId: obj._id,
    action:       "created",
    performedBy:  userId,
    changes:      [{ field: "Key", from: "—", to: obj.key }],
  });
  return obj;
};

export const updateInstrument = async (id, payload, userId) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error("Invalid Instrument ID format");
    err.statusCode = 400;
    throw err;
  }
  const before = await Instrument.findById(id).lean();
  if (!before) {
    const err = new Error("Instrument not found");
    err.statusCode = 404;
    throw err;
  }

  const updated = await Instrument.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).lean();

  const changes = computeInstrumentDiff(before, updated);
  if (changes.length > 0) {
    const action =
      before.isActive !== updated.isActive
        ? (updated.isActive ? "activated" : "deactivated")
        : "updated";
    await logInstrumentAudit({
      instrumentId: updated._id,
      action,
      performedBy:  userId,
      changes,
    });
  }
  return updated;
};

export const setInstrumentActive = async (id, isActive, userId) => {
  return updateInstrument(id, { isActive }, userId);
};

export const deleteInstrument = async (id, userId) => {
  return updateInstrument(id, { isActive: false }, userId);
};
