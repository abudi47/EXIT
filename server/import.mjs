// Loads all study content from the on-disk folders into MongoDB.
//
//   notes/*.md        -> Note(kind="revision")   (17 subjects)
//   new_notes/*.md    -> Note(kind="deepdive")   (9 subjects, mapped by topic)
//   quiz/data/*.json  -> Subject + Question[]     (628 questions)
//
// Re-run any time you add or edit a resource:  npm run import
//
// Lives inside server/ so it resolves server/node_modules for mongoose/dotenv.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

import Subject from "./src/models/Subject.js";
import Question from "./src/models/Question.js";
import Note from "./src/models/Note.js";
import { getMongoUri, redactMongoUri } from "./src/mongoUri.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url)); // mern-app/server
const mernAppDir = path.resolve(__dirname, ".."); // mern-app

// Content dirs are resolved relative to the mern-app/ folder.
// Defaults point one level up at the existing notes/, new_notes/, quiz/data/.
const resolveDir = (envVal, fallback) =>
  path.resolve(mernAppDir, envVal || fallback);

const NOTES_DIR = resolveDir(process.env.CONTENT_NOTES_DIR, "../notes");
const NEW_NOTES_DIR = resolveDir(process.env.CONTENT_NEW_NOTES_DIR, "../new_notes");
const QUIZ_DIR = resolveDir(process.env.CONTENT_QUIZ_DIR, "../quiz/data");

const MONGO_URI = getMongoUri();

const SUBJECT_ICONS = {
  "01_programming": "🧩", "02_dsa": "🌲", "03_oop": "🧱", "04_web": "🌐",
  "05_mobile": "📱", "06_database": "🗄️", "07_os": "⚙️", "08_se": "📐",
  "09_re": "📋", "10_architecture": "🏛️", "11_pm": "📊", "12_testing": "🧪",
  "13_maintenance": "🔧", "14_networking": "🔌", "15_security": "🔐",
  "16_ai": "🤖", "17_ml": "📈",
};

// Exam-revision note files (notes/) -> subject ids.
const REVISION_MAP = {
  "01_Programming_Fundamentals.md": "01_programming",
  "02_Data_Structures_Algorithms.md": "02_dsa",
  "03_Object_Oriented_Programming.md": "03_oop",
  "04_Web_Internet_Programming.md": "04_web",
  "05_Mobile_Application_Development.md": "05_mobile",
  "06_Database_Systems.md": "06_database",
  "07_Operating_Systems.md": "07_os",
  "08_Software_Engineering_Fundamentals.md": "08_se",
  "09_Requirement_Engineering.md": "09_re",
  "10_Software_Architecture_Design.md": "10_architecture",
  "11_Software_Project_Management.md": "11_pm",
  "12_Software_Testing_QA.md": "12_testing",
  "13_Software_Evolution_Maintenance.md": "13_maintenance",
  "14_Fundamentals_of_Networking.md": "14_networking",
  "15_Software_Information_Security.md": "15_security",
  "16_Artificial_Intelligence.md": "16_ai",
  "17_Machine_Learning.md": "17_ml",
};

// Deep-dive teaching note files (new_notes/) -> subject ids, matched by TOPIC.
const DEEPDIVE_MAP = {
  "01_Fundamentals_of_Programming_(C++).md": "01_programming",
  "02_Data_Structures_and_Algorithms.md": "02_dsa",
  "03_Object_Oriented_Programming.md": "03_oop",
  "04_Database_Systems.md": "06_database",
  "07_Data_Communication_and_Networks.md": "14_networking",
  "08_Operating_Systems.md": "07_os",
  "09_Computer_Systems_Security.md": "15_security",
  "13_Artificial_Intelligence.md": "16_ai",
  "14_Fundamentals_of_Software_Engineering.md": "08_se",
};

const h1 = (md) => {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
};

async function run() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  console.log("✓ connected:", redactMongoUri(MONGO_URI));
  console.log("  notes dir    :", NOTES_DIR);
  console.log("  new_notes dir:", NEW_NOTES_DIR);
  console.log("  quiz dir     :", QUIZ_DIR);

  // ---- subjects + questions ----
  let totalQ = 0;
  const quizFiles = fs.readdirSync(QUIZ_DIR).filter((f) => f.endsWith(".json")).sort();
  for (let i = 0; i < quizFiles.length; i++) {
    const file = quizFiles[i];
    const data = JSON.parse(fs.readFileSync(path.join(QUIZ_DIR, file), "utf8"));
    const subjectId = data.id;
    await Subject.findOneAndUpdate(
      { subjectId },
      {
        $set: {
          title: data.subject,
          weight: data.weight ?? 5,
          icon: SUBJECT_ICONS[subjectId] || "📘",
          order: i,
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    // Replace this subject's questions wholesale so edits/removals propagate.
    await Question.deleteMany({ subjectId });
    if (data.questions?.length) {
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
      totalQ += data.questions.length;
    }
    process.stdout.write(`  · ${subjectId} (${data.questions?.length || 0} Q)\n`);
  }

  // ---- revision notes ----
  let revCount = 0;
  for (const [file, subjectId] of Object.entries(REVISION_MAP)) {
    const p = path.join(NOTES_DIR, file);
    if (!fs.existsSync(p)) {
      console.warn(`  ! missing revision note: ${file}`);
      continue;
    }
    const md = fs.readFileSync(p, "utf8");
    await Note.findOneAndUpdate(
      { subjectId, kind: "revision" },
      { $set: { title: h1(md) || subjectId, md } },
      { upsert: true, setDefaultsOnInsert: true }
    );
    revCount++;
  }

  // ---- deep-dive notes ----
  let deepCount = 0;
  for (const [file, subjectId] of Object.entries(DEEPDIVE_MAP)) {
    const p = path.join(NEW_NOTES_DIR, file);
    if (!fs.existsSync(p)) {
      console.warn(`  ! missing deep-dive note: ${file}`);
      continue;
    }
    const md = fs.readFileSync(p, "utf8");
    await Note.findOneAndUpdate(
      { subjectId, kind: "deepdive" },
      { $set: { title: h1(md) || subjectId, md } },
      { upsert: true, setDefaultsOnInsert: true }
    );
    deepCount++;
  }

  // ---- generic pass: admin-uploaded notes named <subjectId>.md ----
  // Runs last so an admin edit deterministically overrides the legacy file.
  // notes/<id>.md -> revision, new_notes/<id>.md -> deepdive.
  const subjectIds = (await Subject.find({}, "subjectId").lean()).map((s) => s.subjectId);
  for (const subjectId of subjectIds) {
    for (const [dir, kind] of [
      [NOTES_DIR, "revision"],
      [NEW_NOTES_DIR, "deepdive"],
    ]) {
      const p = path.join(dir, `${subjectId}.md`);
      if (!fs.existsSync(p)) continue;
      const md = fs.readFileSync(p, "utf8");
      const r = await Note.findOneAndUpdate(
        { subjectId, kind },
        { $set: { title: h1(md) || subjectId, md } },
        { upsert: true, setDefaultsOnInsert: true }
      );
      if (kind === "revision" && !r) revCount++;
      if (kind === "deepdive" && !r) deepCount++;
    }
  }

  console.log(
    `\n✓ imported: ${quizFiles.length} subjects · ${totalQ} questions · ${revCount} revision notes · ${deepCount} deep-dive notes`
  );
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error("✗ import failed:", e);
  process.exit(1);
});
