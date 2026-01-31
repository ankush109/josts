import mongoose from "mongoose";
const reportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    status : {
      type: String,
      enum: ['open', 'in_progress', 'uploaded'],
      default: 'open'
    },  
    filePath  : {
      type: String,
    },
    payload:{
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt : {
      type: Date,
      default: Date.now
    },
    updatedAt : {
      type: Date,
      default: Date.now
    }
},
  { timestamps: true }
);

export default mongoose.model("Report", reportSchema);