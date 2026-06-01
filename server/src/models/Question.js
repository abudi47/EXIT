import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    subjectId: { type: String, required: true, index: true },
    q: { type: String, required: true },
    options: { type: [String], required: true },
    answer: { type: Number, required: true },
    explain: { type: String, default: "" },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Text index powers the global search across question text + explanation.
questionSchema.index({ q: "text", explain: "text" });

export default mongoose.model("Question", questionSchema);
