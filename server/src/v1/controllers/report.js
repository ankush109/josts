import Report from "../../db/models/report.js";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { pushPdfJobToRedis } from "../../utils/func-utils.js";
import User from "../../db/models/user.js";

const s3 = new S3Client({
    region: process.env.AWS_REGION, 
    credentials: {
      accessKeyId: process.env.ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
    },
  });


  export const generateReport = async (req, res) => {
    try {
      const { title, content, payload, status, reportId } = req.body;
  
      let report;
      let action = "create";
  
      // ✏️ Edit existing report
      if (reportId) {
        report = await Report.findById(reportId);
  
        if (!report) {
          return res.status(404).json({ message: "Report not found" });
        }
  
        if (report.reportedBy.toString() !== req.user.userId) {
          return res.status(403).json({ message: "Forbidden" });
        }
  
        report.title = title;
        report.content = content;
        report.payload = payload;
        report.status = "in_progress";
  
        await report.save();
        action = "create";
      } 
      // 🆕 Create new report
      else {
        const reportStatus = status === "draft" ? "draft" : "in_progress";
  
        report = await Report.create({
          title,
          content,
          payload,
          status: reportStatus,
          createdBy: req.user.userId,
          reportedBy: req.user.userId,
        });
      }
  
      console.log("Processed report:", report);
  
      // 🚀 Push to Redis only if not draft
      if (report.status !== "draft") {
        await pushPdfJobToRedis({
          reportId: report.id,
          action,
        });
      }
  
      return res.status(201).json({ report });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: err.message });
    }
  };
  

export const getReportsForUser = async (req, res) => {
  try {
   if(req.user.userRole==="admin"){
    const reports =  await Report.find().sort({ createdAt: -1 });

    const reportsWithUser = await Promise.all(
      reports.map(async (report) => {
        console.log("Processing report:", report);
        const user = await User.findById({
          _id: report.reportedBy,
        }).select("name email");
        console.log("Associated user:", user);
        return {
          ...report.toObject(),
          reportedByUser: user,
        };
      })
    );
    console.log("Reports found: admin", reportsWithUser);
    return res.json({ reports: reportsWithUser });
   }else{
    const reports = await Report.find({ reportedBy: req.user.userId }).sort({ createdAt: -1 });
    console.log("Reports found:", reports);
    res.json({ reports });
   }
   
  } catch (err) {
    res.status(500).json({ message: err.message });
  } 
}

async function getSignedPDFUrl(key) {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
  return url;
}


export const getReportUrl = async (req, res) => {
  try {
    const reportId = req.params.id;
    console.log("Fetching report with ID:", reportId);
    const report = await Report.findById({
        _id: reportId,
    });
console.log("Report found:", report);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // if (report.reportedBy.toString() !== req.user.userId) {
    //   return res.status(403).json({ message: "Forbidden" });
    // }

    if (report.status !== "uploaded" || !report.filePath) {
      return res.status(400).json({ message: "Report not ready yet" });
    }

    // 🔹 Generate signed URL from S3 key
    const signedUrl = await getSignedPDFUrl(report.filePath);

    res.json({ fileUrl: signedUrl }); // send URL to frontend
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getReportById = async (req,res) => {
  try {
    const reportId = req.params.id;
    console.log("Fetching report with ID:", reportId);
    const report = await Report.findById({  
        _id: reportId,
    });
    console.log("Report found:", report);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    if (report.reportedBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json({ report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const getAllMyDrafts = async (req, res) => {
  try {
    const drafts = await Report.find({ reportedBy: req.user.userId, status: "draft" });
    console.log("Drafts found:", drafts);
    res.json({ drafts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } 
}

export const deleteReportById = async (req, res) => {
  try {
    const draftId = req.params.reportId;
    const draft = await Report.findById(draftId);
    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }

    if (draft.reportedBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await Report.findByIdAndDelete(draftId);
    res.json({ message: "Draft deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
} 
export const changeReportStatus = async (req, res) => {
  try {
    const reportId = req.params.reportId;
    const status = req.params.status;
    console.log("Changing status of report ID:", reportId, "to", status);
    //  const userId = req.user.userId;
    //  const userRole = req.user.userRole;
    // if (userRole !== "admin") {
    //   return res.status(403).json({ message: "Forbidden" });
    // }
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    report.approvalStatus = status;
    await report.save();

    res.json({ report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
