import mongoose from "mongoose";
import Parameter from "../models/Parameter.js";

export const listParameters = async (reqQuery = {}) => {
  const { page = 1, limit = 100, search = "", status } = reqQuery;

  const query = {};
  if (status === "true")  query.isActive = true;
  if (status === "false") query.isActive = false;
  if (search) query.parameterName = { $regex: search, $options: "i" };

  const [data, total] = await Promise.all([
    Parameter.find(query)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ parameterName: 1 })
      .lean(),
    Parameter.countDocuments(query),
  ]);

  return {
    success: true,
    data,
    totalPages: Math.ceil(total / Number(limit)),
    currentPage: Number(page),
    totalItems: total,
  };
};

export const getParameterById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error("Invalid Parameter ID");
    err.statusCode = 400;
    throw err;
  }
  const doc = await Parameter.findById(id).lean();
  if (!doc) {
    const err = new Error("Parameter not found");
    err.statusCode = 404;
    throw err;
  }
  return doc;
};

export const createParameter = async (payload, userId) => {
  const doc = await Parameter.create({ ...payload, addedBy: userId });
  return doc.toObject();
};

export const updateParameter = async (id, payload) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error("Invalid Parameter ID");
    err.statusCode = 400;
    throw err;
  }
  const { _id, addedBy, createdAt, __v, ...safe } = payload;
  const updated = await Parameter.findByIdAndUpdate(id, safe, {
    new: true,
    runValidators: true,
  }).lean();
  if (!updated) {
    const err = new Error("Parameter not found");
    err.statusCode = 404;
    throw err;
  }
  return updated;
};

export const setParameterActive = async (id, isActive) => {
  return updateParameter(id, { isActive });
};
