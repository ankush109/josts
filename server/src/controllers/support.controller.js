import * as SupportService from "../services/support.service.js";
import User from "../models/User.js";

export async function submitMessage(req, res, next) {
  try {
    const user = await User.findById(req.user.userId).lean();
    const msg  = await SupportService.submitMessage(req.user.userId, req.body, user);
    res.status(201).json({ message: msg });
  } catch (err) { next(err); }
}

export async function getMyMessages(req, res, next) {
  try {
    const messages = await SupportService.getMyMessages(req.user.userId);
    res.json({ messages });
  } catch (err) { next(err); }
}

export async function getAllMessages(req, res, next) {
  try {
    const messages = await SupportService.getAllMessages();
    res.json({ messages });
  } catch (err) { next(err); }
}

export async function markSeen(req, res, next) {
  try {
    const msg = await SupportService.markSeen(req.params.id);
    res.json({ message: msg });
  } catch (err) { next(err); }
}

export async function replyToMessage(req, res, next) {
  try {
    const user = await User.findById(req.user.userId).lean();
    const msg  = await SupportService.replyToMessage(req.params.id, req.body.reply, user.name);
    res.json({ message: msg });
  } catch (err) { next(err); }
}
