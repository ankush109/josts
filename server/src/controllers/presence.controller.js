import {
  recordHeartbeat,
  listActiveUsers,
  listReportViewers,
  clearUserPresence,
} from "../services/presence.service.js";

export async function heartbeat(req, res, next) {
  try {
    const { route, reportId } = req.body ?? {};
    await recordHeartbeat({
      userId: req.user.userId,
      route:  typeof route === "string" ? route.slice(0, 200) : "",
      reportId: typeof reportId === "string" && reportId ? reportId : null,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function getActive(req, res, next) {
  try {
    const users = await listActiveUsers();
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

export async function getReportViewers(req, res, next) {
  try {
    const viewers = await listReportViewers(req.params.reportId);
    res.json({ viewers });
  } catch (err) {
    next(err);
  }
}

export async function leave(req, res, next) {
  try {
    await clearUserPresence(req.user?.userId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
