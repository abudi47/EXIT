import mongoose from "mongoose";

// Server-side mirror of a device's progress. The client is local-first
// (localStorage) and optionally syncs the whole blob here keyed by deviceId,
// so progress survives a cache clear / moving to another device.
const progressSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true, index: true },
    // { "<subjectId>:<questionId>": { box, due, seen, correct, wrong } }
    srs: { type: mongoose.Schema.Types.Mixed, default: {} },
    // ["<questionId>", ...]
    bookmarks: { type: [String], default: [] },
    // { "<subjectId>": { best, attempts, lastScore } }
    subjectStats: { type: mongoose.Schema.Types.Mixed, default: {} },
    streak: {
      count: { type: Number, default: 0 },
      lastDay: { type: String, default: "" }, // YYYY-MM-DD
    },
  },
  { timestamps: true }
);

export default mongoose.model("Progress", progressSchema);
