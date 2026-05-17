import { Histogram } from "prom-client";
import { register } from "../lib/metricsRegistry.js";

const httpRequestDuration = new Histogram({
  name:       "http_request_duration_seconds",
  help:       "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets:    [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers:  [register],
});

export function metricsMiddleware(req, res, next) {
  const stopTimer = httpRequestDuration.startTimer();

  res.on("finish", () => {
    stopTimer({
      method:      req.method,
      route:       req.route?.path ?? req.path,
      status_code: res.statusCode,
    });
  });

  next();
}
