import "dotenv/config";
import express from "express";
import v1Routes from "./v1/routes/index.js";
import cors from "cors";
const app = express();

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    console.log(
      `${req.method} ${req.originalUrl} → ${res.statusCode}`
    );
  });

  next();
});

app.use(cors({
  origin: "*",
}));

// server.js (or index.js)

import { connectMongo } from "./db/db.config.js";


app.use(express.json());
connectMongo().catch((err) => {
  console.error("Failed to connect to MongoDB", err);
  process.exit(1);
});
// API versions
app.use(v1Routes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

