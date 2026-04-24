import mongoose  from "mongoose";
import Equipment from "../models/Equipment.js";


export const getEquipments = async(reqQuery,reqUser)=>{
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = "", 
      status = "true", 
      sortBy = "nextDue" 
    } = reqQuery

    // 1. Build Search/Filter Object
    const query = {
      isActive: status === "true",
    };

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