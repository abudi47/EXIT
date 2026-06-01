import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    subjectId: { type: String, required: true, index: true },
    kind: { type: String, enum: ["revision", "deepdive"], default: "revision" },
    title: { type: String, required: true },
    md: { type: String, required: true },
  },
  { timestamps: true }
);

// One note per (subject, kind).
noteSchema.index({ subjectId: 1, kind: 1 }, { unique: true });
noteSchema.index({ title: "text", md: "text" });

export default mongoose.model("Note", noteSchema);
