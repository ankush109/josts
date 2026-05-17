import mongoose  from "mongoose";
import Equipment from "../models/Equipment.js";
import {
  computeEquipmentDiff,
  logEquipmentAudit,
} from "./equipment-audit.service.js";


export const getEquipments = async(reqQuery,reqUser)=>{
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      status = "all",
      sortBy = "nextDue"
    } = reqQuery

    // 1. Build Search/Filter Object
    const query = {};
    if (status === "true" || status === "active") query.isActive = true;
    else if (status === "false" || status === "inactive") query.isActive = false;
    // status === "all" → no isActive filter, return everything

    if (search) {
      query.$or = [
        { equipmentName: { $regex: search, $options: "i" } },
        { idNo: { $regex: search, $options: "i" } },
        { nablCert: { $regex: search, $options: "i" } },
        { certificateNo: { $regex: search, $options: "i" } },
      ];
    }

    // 2. Execute Query with Pagination
    const equipment = await Equipment.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ [sortBy]: 1 }) // Defaults to ascending order of nextDue
      .select("-parameters") // Optional: Exclude nested parameters for faster list loading
      .lean(); // Faster execution for read-only operations

    // 3. Get total count for frontend pagination controls
    const count = await Equipment.countDocuments(query);

    return {
      success: true,
      data: equipment,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      totalItems: count,
    };
  } catch (error) {
    throw error
  }
}

export const getEquipmentById = async (id) => {
  try {
    // Validate if the ID is a valid MongoDB ObjectId to prevent casting errors
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid Equipment ID format");
    }

    const equipment = await Equipment.findById(id).lean();

    if (!equipment) {
      const error = new Error("Equipment not found");
      error.statusCode = 404;
      throw error;
    }

    return equipment;
  } catch (error) {
    throw error;
  }
};

export const createEquipment = async (payload, userId) => {
  if (!payload || typeof payload !== "object") {
    const err = new Error("Equipment payload is required");
    err.statusCode = 400;
    throw err;
  }
  if (!payload.equipmentName || !String(payload.equipmentName).trim()) {
    const err = new Error("Equipment name is required");
    err.statusCode = 400;
    throw err;
  }
  if (!payload.idNo || !String(payload.idNo).trim()) {
    const err = new Error("ID No. is required");
    err.statusCode = 400;
    throw err;
  }

  const existing = await Equipment.findOne({ idNo: payload.idNo.trim() }).lean();
  if (existing) {
    const err = new Error(`An equipment with ID No. "${payload.idNo}" already exists`);
    err.statusCode = 409;
    throw err;
  }

  const created = await Equipment.create({
    ...payload,
    idNo: payload.idNo.trim(),
    isActive: payload.isActive ?? true,
  });

  await logEquipmentAudit({
    equipmentId: created._id,
    action: "created",
    performedBy: userId,
    changes: [],
  });

  return created.toObject();
};

export const updateEquipment = async (id, payload, userId) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error("Invalid Equipment ID format");
    err.statusCode = 400;
    throw err;
  }
  const before = await Equipment.findById(id).lean();
  if (!before) {
    const err = new Error("Equipment not found");
    err.statusCode = 404;
    throw err;
  }

  const updated = await Equipment.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).lean();

  const changes = computeEquipmentDiff(before, updated);
  if (changes.length > 0) {
    const action =
      before.isActive !== updated.isActive
        ? (updated.isActive ? "activated" : "deactivated")
        : "updated";
    await logEquipmentAudit({
      equipmentId: updated._id,
      action,
      performedBy: userId,
      changes,
    });
  }
  return updated;
};

export const setEquipmentActive = async (id, isActive, userId) => {
  return updateEquipment(id, { isActive }, userId);
};

export const deleteEquipment = async (id, userId) => {
  return updateEquipment(id, { isActive: false }, userId);
};