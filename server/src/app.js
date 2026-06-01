import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import contentRoutes from "./routes/content.js";
import progressRoutes from "./routes/progress.js";
import adminRoutes from "./routes/admin.js";
import { getMongoUri } from "./mongoUri.js";

const globalCache = globalThis;

/** Reuse one Mongo connection across serverless invocations (Vercel). */
export async function connectDb() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!globalCache.__mongoPromise) {
    const uri = getMongoUri();
    globalCache.__mongoPromise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 15000 })
      .then((m) => {
        console.log("✓ MongoDB connected");
        return m;
      })
      .catch((e) => {
        globalCache.__mongoPromise = null;
        throw e;
      });
  }
  return globalCache.__mongoPromise;
}

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "4mb" }));

  app.use(async (_req, res, next) => {
    try {
      await connectDb();
      next();
    } catch (e) {
      console.error("✗ MongoDB:", e.message);
      res.status(503).json({ error: "database unavailable" });
    }
  });

  app.get("/api/health", async (_req, res) => {
    res.json({ ok: true, db: mongoose.connection.readyState === 1 });
  });

  app.use("/api", contentRoutes);
  app.use("/api/progress", progressRoutes);
  app.use("/api/admin", adminRoutes);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "server error" });
  });

  return app;
}
