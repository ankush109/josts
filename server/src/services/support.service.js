import mongoose from "mongoose";
import SupportMessage from "../models/SupportMessage.js";

export async function submitMessage(userId, { subject, message }, user) {
  return SupportMessage.create({
    userId,
    userName:  user.name,
    userEmail: user.email,
    subject:   subject.trim(),
    message:   message.trim(),
  });
}

/** All messages for the requesting user, newest first. */
export async function getMyMessages(userId) {
  return SupportMessage.find({ userId }).sort({ createdAt: -1 }).lean();
}

/** All messages, for admin. */
export async function getAllMessages() {
  return SupportMessage.find()
    .sort({ createdAt: -1 })
    .populate("userId", "name email")
    .lean();
}

/** Mark a message as seen by admin (idempotent). */
export async function markSeen(messageId) {
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    const err = new Error("Invalid message id"); err.statusCode = 400; throw err;
  }
  return SupportMessage.findByIdAndUpdate(
    messageId,
    { $set: { seenByAdmin: true, seenAt: new Date() } },
    { new: true }
  );
}

/** Admin reply to a message. */
export async function replyToMessage(messageId, reply, adminName) {
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    const err = new Error("Invalid message id"); err.statusCode = 400; throw err;
  }
  const msg = await SupportMessage.findByIdAndUpdate(
    messageId,
    {
      $set: {
        reply:       reply.trim(),
        repliedBy:   adminName,
        repliedAt:   new Date(),
        seenByAdmin: true,
        seenAt:      new Date(),
        status:      "replied",
      },
    },
    { new: true }
  );
  if (!msg) { const err = new Error("Message not found"); err.statusCode = 404; throw err; }
  return msg;
}
