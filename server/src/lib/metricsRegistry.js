import { Registry, collectDefaultMetrics } from "prom-client";

export const register = new Registry();

// CPU, memory, event loop lag, GC stats — all free
collectDefaultMetrics({ register });
