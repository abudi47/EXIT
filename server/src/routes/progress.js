import { Router } from "express";
import Progress from "../models/Progress.js";

const router = Router();

// Load a device's synced progress (creates an empty record on first call).
router.get("/:deviceId", async (req, res) => {
  const { deviceId } = req.params;
  let p = await Progress.findOne({ deviceId }).lean();
  if (!p) {
    p = (await Progress.create({ deviceId })).toObject();
  }
  res.json(p);
});

// Push the whole progress blob up (client is source of truth).
router.put("/:deviceId", async (req, res) => {
  const { deviceId } = req.params;
  const { srs, bookmarks, subjectStats, streak } = req.body || {};
  const update = {};
  if (srs !== undefined) update.srs = srs;
  if (bookmarks !== undefined) update.bookmarks = bookmarks;
  if (subjectStats !== undefined) update.subjectStats = subjectStats;
  if (streak !== undefined) update.streak = streak;
  const p = await Progress.findOneAndUpdate(
    { deviceId },
    { $set: update },
    { new: true, upsert: true }
  ).lean();
  res.json(p);
});

export default router;
