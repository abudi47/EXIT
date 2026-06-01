import path from "node:path";
import { fileURLToPath } from "node:url";

// server/src/lib -> server -> mern-app
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mernAppDir = path.resolve(__dirname, "..", "..", "..");

const resolveDir = (envVal, fallback) =>
  path.resolve(mernAppDir, envVal || fallback);

export const NOTES_DIR = resolveDir(process.env.CONTENT_NOTES_DIR, "../notes");
export const NEW_NOTES_DIR = resolveDir(
  process.env.CONTENT_NEW_NOTES_DIR,
  "../new_notes"
);
export const QUIZ_DIR = resolveDir(process.env.CONTENT_QUIZ_DIR, "../quiz/data");

// Where an admin-uploaded note/question file should be written on disk.
export const noteFilePath = (subjectId, kind) =>
  path.join(kind === "deepdive" ? NEW_NOTES_DIR : NOTES_DIR, `${subjectId}.md`);

export const questionFilePath = (subjectId) =>
  path.join(QUIZ_DIR, `${subjectId}.json`);
