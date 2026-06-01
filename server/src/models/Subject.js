import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    subjectId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    weight: { type: Number, default: 5 },
    icon: { type: String, default: "📘" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Subject", subjectSchema);
