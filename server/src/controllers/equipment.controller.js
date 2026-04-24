import Equipment from "../models/Equipment.js";
import * as EquipementService from "../services/equipment.service.js"

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