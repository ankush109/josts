import mongoose from "mongoose";
import CalibrationReport from "../models/Calibration.js";
import Equipment from "../models/Equipment.js";

export async function getDashboardStats(reqUser) {
  const isAdmin = reqUser.userRole === "admin";
  const now = new Date();

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 86400000);

  const baseFilter = isAdmin
    ? { deletedAt: null }
    : { deletedAt: null, createdBy: new mongoose.Types.ObjectId(reqUser.userId) };

  const [
    total,
    thisMonth,
    lastMonth,
    byStatusRaw,
    equipmentTotal,
    equipmentActive,
    expiringSoon,
    recentReports,
    engineersRaw,
  ] = await Promise.all([
    CalibrationReport.countDocuments(baseFilter),

    CalibrationReport.countDocuments({
      ...baseFilter,
      createdAt: { $gte: thisMonthStart },
    }),

    CalibrationReport.countDocuments({
      ...baseFilter,
      createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd },
    }),

    CalibrationReport.aggregate([
      { $match: baseFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    Equipment.countDocuments({}),

    Equipment.countDocuments({ isActive: true }),

    Equipment.find({
      isActive: true,
      nextDue: { $gte: now, $lte: ninetyDaysFromNow },
    })
      .select("_id equipmentName serialNo nextDue")
      .sort({ nextDue: 1 })
      .lean(),

    CalibrationReport.find(baseFilter)
      .select("_id csrNo customerName status createdAt createdBy")
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate("createdBy", "name")
      .lean(),

    isAdmin
      ? CalibrationReport.aggregate([
          { $match: { deletedAt: null } },
          { $group: { _id: "$createdBy", reportCount: { $sum: 1 } } },
          { $sort: { reportCount: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "userDoc",
            },
          },
          { $unwind: { path: "$userDoc", preserveNullAndEmpty: false } },
          {
            $project: {
              _id: 0,
              userId: "$_id",
              name: "$userDoc.name",
              email: "$userDoc.email",
              reportCount: 1,
            },
          },
        ])
      : Promise.resolve([]),
  ]);

  const byStatus = { draft: 0, submitted: 0, verified: 0, rejected: 0 };
  for (const { _id, count } of byStatusRaw) {
    if (_id in byStatus) byStatus[_id] = count;
  }

  const expiringSoonMapped = expiringSoon.map((eq) => ({
    _id: eq._id,
    equipmentName: eq.equipmentName,
    serialNo: eq.serialNo ?? null,
    nextDue: eq.nextDue,
    daysLeft: Math.ceil((new Date(eq.nextDue).getTime() - now.getTime()) / 86400000),
  }));

  return {
    reports: {
      total,
      thisMonth,
      lastMonth,
      byStatus,
    },
    equipment: {
      total: equipmentTotal,
      active: equipmentActive,
      expiringSoon: expiringSoonMapped,
    },
    engineers: engineersRaw,
    recentReports: recentReports.map((r) => ({
      _id: r._id,
      csrNo: r.csrNo,
      customerName: r.customerName,
      status: r.status,
      createdAt: r.createdAt,
      createdBy: { name: r.createdBy?.name ?? "Unknown" },
    })),
  };
}
