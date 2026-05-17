import { getDashboardStats } from "../services/dashboard.service.js";

export async function getDashboard(req, res, next) {
  try {
    const stats = await getDashboardStats(req.user);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}
