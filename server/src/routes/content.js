import { Router } from "express";
import Subject from "../models/Subject.js";
import Question from "../models/Question.js";
import Note from "../models/Note.js";

const router = Router();

// All subjects, ordered, each with its question count and which note kinds exist.
router.get("/subjects", async (_req, res) => {
  const subjects = await Subject.find().sort({ order: 1 }).lean();
  const [qCounts, notes] = await Promise.all([
    Question.aggregate([{ $group: { _id: "$subjectId", n: { $sum: 1 } } }]),
    Note.find({}, "subjectId kind").lean(),
  ]);
  const countMap = Object.fromEntries(qCounts.map((c) => [c._id, c.n]));
  const noteKinds = {};
  for (const n of notes) (noteKinds[n.subjectId] ||= []).push(n.kind);
  res.json(
    subjects.map((s) => ({
      ...s,
      questionCount: countMap[s.subjectId] || 0,
      noteKinds: noteKinds[s.subjectId] || [],
    }))
  );
});

// Questions for one subject.
router.get("/subjects/:id/questions", async (req, res) => {
  const qs = await Question.find({ subjectId: req.params.id }).lean();
  res.json(qs);
});

// A note: /notes/:subjectId?kind=revision|deepdive
router.get("/notes/:subjectId", async (req, res) => {
  const kind = req.query.kind === "deepdive" ? "deepdive" : "revision";
  let note = await Note.findOne({ subjectId: req.params.subjectId, kind }).lean();
  if (!note && kind === "deepdive") {
    note = await Note.findOne({ subjectId: req.params.subjectId, kind: "revision" }).lean();
  }
  if (!note) return res.status(404).json({ error: "note not found" });
  res.json(note);
});

// Whole question bank (used by exam mode to build a weighted set client-side).
router.get("/questions", async (_req, res) => {
  const qs = await Question.find().lean();
  res.json(qs);
});

// Global search across notes + questions. /search?q=term
router.get("/search", async (req, res) => {
  const term = (req.query.q || "").trim();
  if (term.length < 2) return res.json({ notes: [], questions: [] });
  const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const [questions, notes] = await Promise.all([
    Question.find({ $or: [{ q: rx }, { explain: rx }] })
      .limit(40)
      .lean(),
    Note.find({ $or: [{ title: rx }, { md: rx }] }, "subjectId kind title")
      .limit(20)
      .lean(),
  ]);
  // For note hits, attach a short snippet around the first match.
  const noteHits = notes.map((n) => {
    const idx = n.md ? n.md.search(rx) : -1;
    const snippet =
      idx >= 0 ? n.md.slice(Math.max(0, idx - 50), idx + 90).replace(/\s+/g, " ") : "";
    return { subjectId: n.subjectId, kind: n.kind, title: n.title, snippet };
  });
  res.json({ questions, notes: noteHits });
});

export default router;
