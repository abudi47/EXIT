import { Router } from "express";
import fs from "node:fs/promises";
import Subject from "../models/Subject.js";
import Question from "../models/Question.js";
import Note from "../models/Note.js";
import { noteFilePath, questionFilePath } from "../lib/contentPaths.js";

const router = Router();

const SUBJECT_ICONS = {
  "01_programming": "🧩", "02_dsa": "🌲", "03_oop": "🧱", "04_web": "🌐",
  "05_mobile": "📱", "06_database": "🗄️", "07_os": "⚙️", "08_se": "📐",
  "09_re": "📋", "10_architecture": "🏛️", "11_pm": "📊", "12_testing": "🧪",
  "13_maintenance": "🔧", "14_networking": "🔌", "15_security": "🔐",
  "16_ai": "🤖", "17_ml": "📈",
};

const h1Title = (md) => {
  const m = (md || "").match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
};

// Lightweight shared-secret guard for all content-editing endpoints.
router.use((req, res, next) => {
  const token = req.get("x-admin-token");
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "unauthorized — set x-admin-token" });
  }
  next();
});

// Lets the login form verify the password before showing the admin page.
router.get("/ping", (_req, res) => res.json({ ok: true }));

// Create or update a subject.
router.put("/subjects/:subjectId", async (req, res) => {
  const { title, weight, icon, order } = req.body || {};
  const s = await Subject.findOneAndUpdate(
    { subjectId: req.params.subjectId },
    { $set: { title, weight, icon, order } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  res.json(s);
});

// Add a question to a subject.
router.post("/subjects/:subjectId/questions", async (req, res) => {
  const { q, options, answer, explain, tags } = req.body || {};
  if (!q || !Array.isArray(options) || typeof answer !== "number") {
    return res.status(400).json({ error: "need q, options[], answer:number" });
  }
  const created = await Question.create({
    subjectId: req.params.subjectId,
    q,
    options,
    answer,
    explain: explain || "",
    tags: tags || [],
  });
  res.status(201).json(created);
});

router.put("/questions/:id", async (req, res) => {
  const { q, options, answer, explain, tags } = req.body || {};
  const updated = await Question.findByIdAndUpdate(
    req.params.id,
    { $set: { q, options, answer, explain, tags } },
    { new: true }
  );
  if (!updated) return res.status(404).json({ error: "not found" });
  res.json(updated);
});

router.delete("/questions/:id", async (req, res) => {
  const r = await Question.findByIdAndDelete(req.params.id);
  if (!r) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

// Create or replace a note (revision or deepdive) for a subject.
router.put("/notes/:subjectId", async (req, res) => {
  const { kind, title, md } = req.body || {};
  const k = kind === "deepdive" ? "deepdive" : "revision";
  if (!title || !md) return res.status(400).json({ error: "need title, md" });
  const note = await Note.findOneAndUpdate(
    { subjectId: req.params.subjectId, kind: k },
    { $set: { title, md } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  res.json(note);
});

// ── Upload a full questions JSON file (same shape as quiz/data/*.json) ──
// Validates strictly and saves NOTHING if invalid. On success: upserts the
// subject, replaces that subject's questions, and writes the file to disk.
router.post("/upload/questions", async (req, res) => {
  const data = req.body || {};
  const errors = [];

  const subjectId = typeof data.id === "string" ? data.id.trim() : "";
  if (!subjectId) errors.push("missing top-level \"id\" (the subjectId)");
  else if (!/^[a-z0-9_]+$/i.test(subjectId))
    errors.push('"id" may only contain letters, digits, and underscores');
  if (!data.subject || typeof data.subject !== "string")
    errors.push('missing "subject" (the display title)');
  if (!Array.isArray(data.questions) || data.questions.length === 0)
    errors.push('"questions" must be a non-empty array');

  if (Array.isArray(data.questions)) {
    data.questions.forEach((q, i) => {
      const at = `question[${i}]`;
      if (!q || typeof q.q !== "string" || !q.q.trim())
        errors.push(`${at}: missing "q" text`);
      if (!Array.isArray(q.options) || q.options.length < 2)
        errors.push(`${at}: needs an "options" array of at least 2`);
      else if (q.options.some((o) => typeof o !== "string"))
        errors.push(`${at}: every option must be a string`);
      if (!Number.isInteger(q.answer))
        errors.push(`${at}: "answer" must be an integer index`);
      else if (Array.isArray(q.options) && (q.answer < 0 || q.answer >= q.options.length))
        errors.push(`${at}: "answer" ${q.answer} is out of range for ${q.options?.length} options`);
    });
  }

  if (errors.length) return res.status(400).json({ ok: false, errors });

  await Subject.findOneAndUpdate(
    { subjectId },
    {
      $set: {
        title: data.subject,
        weight: Number.isFinite(data.weight) ? data.weight : 5,
        icon: SUBJECT_ICONS[subjectId] || "📘",
      },
      $setOnInsert: { order: 999 },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
  await Question.deleteMany({ subjectId });
  await Question.insertMany(
    data.questions.map((q) => ({
      subjectId,
      q: q.q,
      options: q.options,
      answer: q.answer,
      explain: q.explain || "",
      tags: q.tags || [],
    }))
  );

  // Best-effort disk write so re-imports stay safe and nothing is DB-only.
  let diskWarning = null;
  try {
    await fs.writeFile(questionFilePath(subjectId), JSON.stringify(data, null, 1), "utf8");
  } catch (e) {
    diskWarning = `saved to database, but writing the file failed: ${e.message}`;
  }

  res.json({ ok: true, subjectId, count: data.questions.length, diskWarning });
});

// ── Upload a single markdown note (revision or deepdive) ──
router.post("/upload/note", async (req, res) => {
  const { subjectId, kind, md } = req.body || {};
  const k = kind === "deepdive" ? "deepdive" : "revision";
  if (!subjectId || typeof subjectId !== "string")
    return res.status(400).json({ ok: false, errors: ["missing subjectId"] });
  if (!md || typeof md !== "string" || !md.trim())
    return res.status(400).json({ ok: false, errors: ["markdown content is empty"] });

  const subject = await Subject.findOne({ subjectId }).lean();
  if (!subject)
    return res.status(400).json({ ok: false, errors: [`unknown subjectId "${subjectId}"`] });

  const title = h1Title(md) || subject.title;
  await Note.findOneAndUpdate(
    { subjectId, kind: k },
    { $set: { title, md } },
    { upsert: true, setDefaultsOnInsert: true }
  );

  let diskWarning = null;
  try {
    await fs.writeFile(noteFilePath(subjectId, k), md, "utf8");
  } catch (e) {
    diskWarning = `saved to database, but writing the file failed: ${e.message}`;
  }

  res.json({ ok: true, subjectId, kind: k, title, diskWarning });
});

export default router;
