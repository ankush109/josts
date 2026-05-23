import mongoose from "mongoose";
import CalibrationReport from "../models/Calibration.js";
import Equipment from "../models/Equipment.js";
import AuditLog from "../models/AuditLog.js";

const DAY_MS = 86400000;

export async function getDashboardStats(reqUser) {
  const isAdmin = reqUser.userRole === "admin";
  const now = new Date();

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * DAY_MS);
  const trendStart = new Date(now.getTime() - 90 * DAY_MS);

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
    trendRaw,
    topCustomersRaw,
    topViewedRaw,
    auditFeedRaw,
    avgVerifyRaw,
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
      .select("_id customerName status createdAt createdBy viewCount")
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
          { $unwind: { path: "$userDoc", preserveNullAndEmptyArrays: false } },
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

    // ── Trend: daily report counts × status, last 90 days ────────────────────
    CalibrationReport.aggregate([
      { $match: { ...baseFilter, createdAt: { $gte: trendStart } } },
      {
        $group: {
          _id: {
            day:    { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.day": 1 } },
    ]),

    // ── Top customers by report count ────────────────────────────────────────
    CalibrationReport.aggregate([
      { $match: { ...baseFilter, customerName: { $nin: [null, ""] } } },
      {
        $group: {
          _id: "$customerName",
          reportCount: { $sum: 1 },
          lastReportAt: { $max: "$createdAt" },
        },
      },
      { $sort: { reportCount: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          customerName: "$_id",
          reportCount: 1,
          lastReportAt: 1,
        },
      },
    ]),

    // ── Most-viewed reports ──────────────────────────────────────────────────
    CalibrationReport.find({ ...baseFilter, viewCount: { $gt: 0 } })
      .select("_id customerName status viewCount lastViewedAt createdBy")
      .sort({ viewCount: -1 })
      .limit(10)
      .populate("createdBy", "name")
      .lean(),

    // ── Audit feed (admin only — global; users see only their report actions)
    isAdmin
      ? AuditLog.find({})
          .sort({ createdAt: -1 })
          .limit(15)
          .populate("performedBy", "name email")
          .populate("reportId", "customerName status")
          .lean()
      : AuditLog.aggregate([
          {
            $lookup: {
              from: "calibrationreports",
              localField: "reportId",
              foreignField: "_id",
              as: "report",
            },
          },
          { $unwind: "$report" },
          { $match: { "report.createdBy": new mongoose.Types.ObjectId(reqUser.userId) } },
          { $sort: { createdAt: -1 } },
          { $limit: 15 },
          {
            $lookup: {
              from: "users",
              localField: "performedBy",
              foreignField: "_id",
              as: "user",
            },
          },
          { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              action: 1,
              changes: 1,
              createdAt: 1,
              reportId: { _id: "$report._id", customerName: "$report.customerName", status: "$report.status" },
              performedBy: { _id: "$user._id", name: "$user.name", email: "$user.email" },
            },
          },
        ]),

    // ── Avg time from submitted → verified ───────────────────────────────────
    CalibrationReport.aggregate([
      { $match: { ...baseFilter, status: "verified", "signatures.verifiedAt": { $ne: null } } },
      {
        $project: {
          deltaDays: {
            $divide: [
              { $subtract: ["$signatures.verifiedAt", "$createdAt"] },
              DAY_MS,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgDays: { $avg: "$deltaDays" },
          count:   { $sum: 1 },
        },
      },
    ]),
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
    daysLeft: Math.ceil((new Date(eq.nextDue).getTime() - now.getTime()) / DAY_MS),
  }));

  // ── Expiring buckets (<7, 7–30, 30–90 days)
  const expiringBuckets = { critical: 0, soon: 0, upcoming: 0 };
  for (const eq of expiringSoonMapped) {
    if (eq.daysLeft <= 7)       expiringBuckets.critical += 1;
    else if (eq.daysLeft <= 30) expiringBuckets.soon     += 1;
    else                         expiringBuckets.upcoming += 1;
  }

  // ── Build dense daily trend series (fill gaps with zero)
  const trendMap = new Map();
  for (const row of trendRaw) {
    const key = row._id.day;
    const bucket = trendMap.get(key) ?? { day: key, draft: 0, submitted: 0, verified: 0, rejected: 0, total: 0 };
    if (row._id.status in bucket) bucket[row._id.status] = row.count;
    bucket.total += row.count;
    trendMap.set(key, bucket);
  }
  const trend = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    trend.push(
      trendMap.get(key) ?? { day: key, draft: 0, submitted: 0, verified: 0, rejected: 0, total: 0 }
    );
  }

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
      expiringBuckets,
    },
    engineers: engineersRaw,
    recentReports: recentReports.map((r) => ({
      _id: r._id,
      customerName: r.customerName,
      status: r.status,
      createdAt: r.createdAt,
      createdBy: { name: r.createdBy?.name ?? "Unknown" },
      viewCount: r.viewCount ?? 0,
    })),
    trend,
    topCustomers: topCustomersRaw,
    topViewed: topViewedRaw.map((r) => ({
      _id: r._id,
      customerName: r.customerName,
      status: r.status,
      viewCount: r.viewCount,
      lastViewedAt: r.lastViewedAt,
      createdBy: { name: r.createdBy?.name ?? "Unknown" },
    })),
    auditFeed: auditFeedRaw.map((a) => ({
      _id: a._id,
      action: a.action,
      changes: a.changes ?? [],
      createdAt: a.createdAt,
      performedBy: a.performedBy
        ? { name: a.performedBy.name ?? "Unknown", email: a.performedBy.email ?? "" }
        : null,
      reportId: a.reportId
        ? { _id: a.reportId._id, customerName: a.reportId.customerName, status: a.reportId.status }
        : null,
    })),
    avgVerifyDays: avgVerifyRaw[0]
      ? { value: Math.round(avgVerifyRaw[0].avgDays * 10) / 10, sampleSize: avgVerifyRaw[0].count }
      : null,
  };
}
