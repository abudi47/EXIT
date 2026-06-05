# 🎓 SE Exit Exam — MERN Study Platform

A full **MERN** (MongoDB · Express · React · Node) rebuild of your offline practice app, with everything the single-file version had **plus**:

- 🌗 **Light & dark mode** (remembers your choice, respects your OS setting)
- 📚 **Two views per subject** — quick **Revision** notes ⇄ deeper **Deep-dive** teaching notes
- ⭐ **Bookmark / star** hard questions
- 🔍 **Global search** across every subject's notes *and* questions
- 📊 **Progress dashboard** — best scores, weak-area heatmap, day streak
- 🃏 **Spaced-repetition flashcards** (Leitner) — questions you miss come back sooner
- ✏️ **Add/edit content from the browser or by dropping a file + re-importing**

Your original double-click app is untouched in `../quiz/` and still works offline as an exam-day fallback.

---

## ✅ Prerequisites

| Tool | You have | Notes |
|------|----------|-------|
| Node 18+ | ✔ v22 | runs server + client |
| Docker | ✔ | runs MongoDB in a container (Mongo isn't installed natively) |

> No Docker? Install MongoDB Community locally and set `MONGO_URI` in `.env` to your server instead — everything else is the same.

---

## ▶ Quick start (one command)

From this `mern-app/` folder:

```bash
bash setup.sh
```

That starts MongoDB, installs both apps' dependencies, and imports all 628 questions + 26 notes. Then run the two dev servers in **two terminals**:

```bash
# Terminal 1 — API
cd mern-app/server && npm run dev      # → http://127.0.0.1:4000

# Terminal 2 — web app
cd mern-app/client && npm run dev      # → http://localhost:5173
```

Open **http://localhost:5173**.

### Or step-by-step (if you prefer)

```bash
cd mern-app
cp .env.example .env && cp .env server/.env   # already done for you
docker compose up -d                          # start MongoDB
cd server && npm install && npm run import    # load content
npm run dev                                    # start API
# new terminal:
cd ../client && npm install && npm run dev     # start web app
```

---

## 🔄 Adding new resources (your "update content" workflow)

**Option A — the Admin page (easiest):** click the 🔒 button in the header, enter your `ADMIN_TOKEN` password, and you get two uploaders:

- **Upload questions** — pick a `.json` file shaped like `quiz/data/*.json` (`{ id, subject, weight, questions:[…] }`). It's schema-checked in the browser first (you see any errors instantly), then on Save it upserts the subject, replaces that subject's questions, and writes `quiz/data/<id>.json` back to disk.
- **Upload a note** — choose a subject + Revision/Deep-dive, then drop a `.md` file (or paste markdown). The title comes from the first `# heading`. On Save it's stored in Mongo and written to `notes/<id>.md` or `new_notes/<id>.md`.

Because every upload is **saved to both MongoDB and the source folder**, re-running the importer later never clobbers your uploads — they're real files now.

**Option B — drop a file, re-import (bulk):**
1. Add/edit a markdown note in `../notes/` (revision) or `../new_notes/` (deep-dive), or a question JSON in `../quiz/data/`.
2. Run:
   ```bash
   cd mern-app/server && npm run import
   ```
   Re-importing is safe anytime — it upserts subjects/notes and fully replaces each subject's question set. A generic pass also loads any `notes/<id>.md` / `new_notes/<id>.md` (the names admin uploads use), so file edits and admin uploads stay in sync.

**Option C — raw API:** the same admin endpoints, callable with `curl` (send your password as the `x-admin-token` header):

```bash
# upload a questions file
curl -X POST http://127.0.0.1:4000/api/admin/upload/questions \
  -H "x-admin-token: change-me-please" -H "Content-Type: application/json" \
  --data-binary @../quiz/data/02_dsa.json

# upload a note
curl -X POST http://127.0.0.1:4000/api/admin/upload/note \
  -H "x-admin-token: change-me-please" -H "Content-Type: application/json" \
  -d '{"subjectId":"02_dsa","kind":"deepdive","md":"# DSA — Deep Dive\n..."}'
```

> Change `ADMIN_TOKEN` in `.env` before exposing this anywhere — it's the only thing guarding content edits.

---

## 🗂 Project layout

```
mern-app/
├─ docker-compose.yml      # MongoDB 7 container
├─ setup.sh                # one-shot installer + importer
├─ .env / .env.example     # config (port, Mongo URI, content dirs, admin token)
├─ server/                 # Express + Mongoose API
│  ├─ src/index.js         # app entry
│  ├─ src/models/          # Subject, Question, Note, Progress
│  ├─ src/routes/          # content, progress, admin
│  └─ import.mjs           # reads ../notes, ../new_notes, ../quiz/data → Mongo
└─ client/                 # Vite + React app
   ├─ src/App.jsx          # shell, header (theme/search/streak), routing
   ├─ src/pages/           # Home, SubjectPicker, NotesReader, Study*, Exam*, Flashcards, Search, Dashboard
   └─ src/lib/             # api, markdown renderer, theme/swipe hooks, progress+SRS store
```

## 📚 Content sources (unchanged on disk)

| Source folder | Becomes | Count |
|---|---|---|
| `../quiz/data/*.json` | subjects + questions | 17 subjects · 628 Q |
| `../notes/*.md` | **revision** notes | 17 |
| `../new_notes/*.md` | **deep-dive** notes | 17 (all subjects) |

Every subject now has both a revision note and a deep-dive note. Deep-dives come from two naming conventions, both handled by the importer: the original 9 use descriptive filenames mapped in `DEEPDIVE_MAP`, and the rest are named `<subjectId>.md` (e.g. `04_web.md`), which the importer's generic pass loads automatically. To add or replace one, drop a `<subjectId>.md` in `../new_notes/` and re-import — no code change needed.

## 🧠 How spaced repetition works

Each question sits in a Leitner **box (1–6)**. Answer right → it moves up a box and won't resurface for 1, 2, 4, 8, then 16 days. Answer wrong → back to box 1 (tomorrow). The **Flashcards** mode and the dashboard's "due to review" count pull exactly the cards whose date has arrived, so you always study the things you're about to forget.

## 🔒 Notes on data & privacy

Your progress lives in the browser (`localStorage`) first and is the source of truth, so the app keeps working if the API is down. When the server is up it also syncs a copy keyed by an anonymous per-device id (no login), so a cache-clear doesn't wipe your streak. Add real auth later by swapping the device id for a user id — the seam is in `server/src/routes/progress.js` and `client/src/lib/store.js`.

---

## 🚀 Deploy to Vercel (frontend + API together)

The repo is set up so **one Vercel project** serves the React app and the Express API on the same domain (`/api/...`), talking to **MongoDB Atlas**.

### Before you deploy

1. **Atlas is live** — `MONGO_URI` works locally (`npm run dev` in `server/` shows `✓ MongoDB connected`).
2. **Content is imported** — from your machine:
   ```bash
   cd mern-app/server && npm run import
   ```
   (Vercel cannot read your local `../notes` or `../quiz` folders; the database must already have data.)
3. **Atlas Network Access** — allow `0.0.0.0/0` (or Vercel’s IPs) so serverless functions can connect.

### Deploy steps

1. Push this project to **GitHub** (or GitLab / Bitbucket).
2. Go to [vercel.com/new](https://vercel.com/new) → **Import** the repo.
3. Set **Root Directory** to `mern-app` (not the repo root if `mern-app` is in a subfolder).
4. Vercel should detect `vercel.json` — leave **Build Command** / **Output Directory** as defined there.
5. **Environment variables** (Production + Preview):

   | Name | Value |
   |------|--------|
   | `MONGO_URI` | Your Atlas `mongodb+srv://…/se_exit_exam?…` string |
   | `ADMIN_TOKEN` | A long random secret (not `change-me-please`) |

6. Click **Deploy**.

### After deploy

- Open `https://<your-project>.vercel.app` — home should load subjects from Atlas.
- Check API: `https://<your-project>.vercel.app/api/health` → `{ "ok": true, "db": true }`.
- **Admin uploads** still save to MongoDB; writing files under `quiz/` / `notes/` may fail on Vercel (read-only filesystem) — you’ll see a `diskWarning` in the response. Re-import from your laptop when you need files on disk.

### CLI alternative

```bash
cd mern-app
npx vercel
npx vercel env add MONGO_URI
npx vercel env add ADMIN_TOKEN
npx vercel --prod
```

### Split API (optional)

If you prefer the API elsewhere (Railway, Render, etc.), deploy only `client/` to Vercel and set **`VITE_API_URL`** to your API origin (e.g. `https://api.example.com/api`) at build time.
