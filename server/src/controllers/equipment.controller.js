import Equipment from "../models/Equipment.js";
import * as EquipementService from "../services/equipment.service.js"
import { getEquipmentAudit } from "../services/equipment-audit.service.js";
import { getPresignedUploadUrl, getSignedDownloadUrl } from "../lib/s3.js";

// Returns all equipment with only _id, equipmentName, and parameter names — used by the calibration form combobox
export const getEquipmentParamSummary = async (req, res, next) => {
  try {
    const equipments = await Equipment.find({ isActive: true })
      .select("equipmentName make model serialNo nextDue parameters.parameterName")
      .lean();
    res.status(200).json({ success: true, data: equipments });
  } catch (err) {
    next(err);
  }
};

export const getEquipmentList = async (req, res, next) => {
try {
    const report = await EquipementService.getEquipments(req.query, req.user.userId);
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
};

export const getEquipmentDetails = async (req, res, next) => {
  try {
    // We get the ID from the URL parameters (e.g., /api/equipment/69ebd...)
    const { id } = req.params;

    const equipment = await EquipementService.getEquipmentById(id);

    res.status(200).json({
      success: true,
      data: equipment
    });
  } catch (err) {
    next(err);
  }
};

export const createEquipment = async (req, res, next) => {
  try {
    const data = await EquipementService.createEquipment(req.body, req.user?.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateEquipment = async (req, res, next) => {
  try {
    const data = await EquipementService.updateEquipment(
      req.params.id,
      req.body,
      req.user?.userId,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const setEquipmentActive = async (req, res, next) => {
  try {
    const data = await EquipementService.setEquipmentActive(
      req.params.id,
      Boolean(req.body?.isActive),
      req.user?.userId,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteEquipment = async (req, res, next) => {
  try {
    const data = await EquipementService.deleteEquipment(
      req.params.id,
      req.user?.userId,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getEquipmentHistory = async (req, res, next) => {
  try {
    const data = await getEquipmentAudit(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getTraceabilityPresignUrl = async (req, res, next) => {
  try {
    const { id } = req.params;
    const contentType = req.body?.contentType
      ?? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const key = `traceability/equipment-${id}`;
    const uploadUrl = await getPresignedUploadUrl(key, contentType);
    res.status(200).json({ success: true, uploadUrl, key });
  } catch (err) {
    next(err);
  }
};

export const getTraceabilityDownloadUrl = async (req, res, next) => {
  try {
    const { id } = req.params;
    const equipment = await Equipment.findById(id).select("traceabilityFileKey").lean();
    if (!equipment?.traceabilityFileKey) {
      const err = new Error("No traceability file attached to this equipment");
      err.statusCode = 404;
      throw err;
    }
    const downloadUrl = await getSignedDownloadUrl(equipment.traceabilityFileKey);
    res.status(200).json({ success: true, downloadUrl });
  } catch (err) {
    next(err);
  }
};