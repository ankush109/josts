import mongoose from "mongoose";
import CalibrationReport from "../../db/models/calibration.js";
import User from "../../db/models/user.js";
import { computeUncertaintyBudget } from "../utils/calibration-compute.js";
import { getInstrumentLookup } from "../constants/voltage-ranges.js";
import { pushPdfJobToRedis } from "../../utils/func-utils.js";

// ─── Certificate No generator ─────────────────────────────────────────────────
// Format: JK/DDMMYY/CustomerFirstLetter/EngineerInitials/SequentialNo

function getInitials(name = "") {
  return name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

async function generateCertNo(userId, customerName) {
  const [user, count] = await Promise.all([
    User.findById(userId).lean(),
    CalibrationReport.countDocuments(),
  ]);
  const d      = new Date();
  const ddmmyy = `${String(d.getDate()).padStart(2,"0")}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getFullYear()).slice(-2)}`;
  const cust   = (customerName?.trim()[0] ?? "X").toUpperCase();
  const eng    = getInitials(user?.name ?? "ENG");
  const seq    = String(count + 1).padStart(3, "0");
  return `JK/${ddmmyy}/${cust}/${eng}/${seq}`;
}

// ─── Inject computed uncertainty budget into every measurement ─────────────────

function injectComputed(instruments) {
  if (!Array.isArray(instruments)) return instruments;
 
  return instruments.map((inst) => {
    // Build param → label → constants lookup for THIS instrument
    const instrumentName = inst.make + " " + inst.modelType
    console.log(instrumentName,"instrument")
    const lookup = getInstrumentLookup(instrumentName);
 
    return {
      ...inst,
      parameters: (inst.parameters ?? []).map((param) => ({
        ...param,
        ranges: (param.ranges ?? []).map((range) => {
          const constants = lookup[param.name]?.[range.label];
 
          return {
            ...range,
            measurements: (range.measurements ?? []).map((m) => {
              if (!constants || m.nomValue == null) {
                return { ...m, computed: null };
              }
 
              const budget = computeUncertaintyBudget({
                nomValue:   m.nomValue,
                readings:   (m.readings ?? []).filter(
                  (r) => r != null && !isNaN(r)
                ),
                stdUncPct:  constants.stdUncPct,
                accPct:     constants.accPct,
                accOffset:  constants.accOffset,
                leastCount: constants.leastCount,
                scopePct:   constants.scopePct,
              });
 
              return { ...m, computed: budget };
            }),
          };
        }),
      })),
    };
  });
}


// ─── Create report ────────────────────────────────────────────────────────────

export const createCalibrationReport = async (req, res) => {
  try {
    const {
      csrNo, createdBy, instruments, formatNo, status, signatures,
      customerName, customerAddress, customerRefNo,
      ducReceivedDate, calibrationLocation, dateOfCalibration, calibrationDueDate,
    } = req.body;

    if (!csrNo?.trim()) {
      return res.status(400).json({ message: "csrNo is required" });
    }

    if (!createdBy || !mongoose.Types.ObjectId.isValid(createdBy)) {
      return res.status(400).json({ message: "valid createdBy user id is required" });
    }

    const certNo = await generateCertNo(createdBy, customerName);

    const report = await CalibrationReport.create({
      csrNo: csrNo.trim(),
      certNo,
      customerName, customerAddress, customerRefNo,
      ducReceivedDate: ducReceivedDate || null,
      calibrationLocation: calibrationLocation || "at_lab",
      dateOfCalibration:  dateOfCalibration  || null,
      calibrationDueDate: calibrationDueDate || null,
      formatNo,
      status,
      createdBy,
      instruments: injectComputed(instruments ?? []),
      signatures:  signatures ?? {},
    });

    if (report.status !== "draft") {
      await pushPdfJobToRedis({ reportId: report._id, action: "create", type: "calibration" });
    }

    res.status(201).json(report);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: `CSR number '${req.body.csrNo}' already exists` });
    }
    res.status(500).json({ message: err.message });
  }
};

// ─── Get all reports ──────────────────────────────────────────────────────────
// Lightweight list — instruments stripped to a count
// Query params: ?status=draft  ?createdBy=<id>  ?search=JK  ?page=1  ?limit=20

export const getAllCalibrationReports = async (req, res) => {
  try {
    const { status, createdBy, search, page = 1, limit = 20 } = req.query;

    const filter = {};

    if (status) filter.status = status;

    // Engineers only see their own reports; admins see all
    if (req.user.userRole !== "admin") {
      filter.createdBy = req.user.userId;
    } else if (createdBy) {
      if (!mongoose.Types.ObjectId.isValid(createdBy)) {
        return res.status(400).json({ message: "invalid createdBy id" });
      }
      filter.createdBy = createdBy;
    }

    if (search) filter.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);

    const [reports, total] = await Promise.all([
      CalibrationReport.find(filter)
        .select("csrNo formatNo status createdBy signatures createdAt updatedAt instruments filePath")
        .populate("createdBy", "name email")
        .populate("signatures.calibratedBy", "name email signatureName")
        .populate("signatures.verifiedBy",   "name email signatureName")
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      CalibrationReport.countDocuments(filter),
    ]);

    const items = reports.map((r) => ({
      _id:             r._id,
      csrNo:           r.csrNo,
      formatNo:        r.formatNo,
      status:          r.status,
      createdBy:       r.createdBy,
      signatures:      r.signatures,
      instrumentCount: r.instruments?.length ?? 0,
      filePath:        r.filePath ?? null,
      createdAt:       r.createdAt,
      updatedAt:       r.updatedAt,
    }));

    res.json({
      items,
      total,
      page:  Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Get single report ────────────────────────────────────────────────────────

export const getCalibrationReportById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.reportId)) {
      return res.status(400).json({ message: "invalid report id" });
    }

    const report = await CalibrationReport.findById(req.params.reportId)
      .populate("createdBy",               "name email location signatureName")
      .populate("signatures.calibratedBy", "name email signatureName")
      .populate("signatures.verifiedBy",   "name email signatureName")
      .lean();

    if (!report) {
      return res.status(404).json({ message: "report not found" });
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Update report ────────────────────────────────────────────────────────────
// Partial update via $set — only changed fields are sent, nothing else is touched

export const updateCalibrationReport = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.reportId)) {
      return res.status(400).json({ message: "invalid report id" });
    }

    const { _id, createdBy, createdAt, __v, ...updates } = req.body;

    if (updates.instruments) updates.instruments = injectComputed(updates.instruments);

    const report = await CalibrationReport.findByIdAndUpdate(
      req.params.reportId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("createdBy",               "name email signatureName")
      .populate("signatures.calibratedBy", "name email signatureName")
      .populate("signatures.verifiedBy",   "name email signatureName")
      .lean();

    if (!report) {
      return res.status(404).json({ message: "report not found" });
    }

    if (report.status !== "draft") {
      await pushPdfJobToRedis({ reportId: report._id, action: "edit", type: "calibration" });
    }

    res.json(report);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: `CSR number '${req.body.csrNo}' already exists` });
    }
    res.status(500).json({ message: err.message });
  }
};

// ─── Verify / Reject report (admin only) ─────────────────────────────────────

export const verifyOrRejectReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ message: "invalid report id" });
    }

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({ message: "status must be 'verified' or 'rejected'" });
    }

    const report = await CalibrationReport.findByIdAndUpdate(
      reportId,
      {
        $set: {
          status,
          "signatures.verifiedBy": req.user.userId,
          "signatures.verifiedAt": new Date(),
        },
      },
      { new: true, runValidators: true }
    )
      .populate("createdBy",               "name email signatureName")
      .populate("signatures.calibratedBy", "name email signatureName")
      .populate("signatures.verifiedBy",   "name email signatureName")
      .lean();

    if (!report) {
      return res.status(404).json({ message: "report not found" });
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Delete report ────────────────────────────────────────────────────────────
// Hard delete — only allowed on draft reports

export const deleteReport = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "invalid report id" });
    }

    const report = await CalibrationReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: "report not found" });
    }

    if (report.status !== "draft") {
      return res.status(403).json({ message: "only draft reports can be deleted" });
    }

    await report.deleteOne();

    res.json({ message: "report deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};