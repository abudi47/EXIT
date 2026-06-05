import { useState, useEffect, useCallback } from "react";
import { api } from "./lib/api.js";
import { useTheme } from "./lib/hooks.js";
import { useStore } from "./lib/store.js";
import { haptic } from "./lib/markdown.js";

import Home from "./pages/Home.jsx";
import SubjectPicker from "./pages/SubjectPicker.jsx";
import NotesReader from "./pages/NotesReader.jsx";
import StudySetup from "./pages/StudySetup.jsx";
import StudyMode from "./pages/StudyMode.jsx";
import ExamSetup from "./pages/ExamSetup.jsx";
import ExamMode from "./pages/ExamMode.jsx";
import Flashcards from "./pages/Flashcards.jsx";
import SearchPage from "./pages/SearchPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
  const { theme, toggle } = useTheme();
  const store = useStore();
  const [subjects, setSubjects] = useState(null);
  const [view, setView] = useState({ name: "home" });
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setSubjects(await api.subjects());
        setError(null);
      } catch {
        let msg = "Could not load subjects from the API.";
        try {
          const r = await fetch("/api/health");
          const body = await r.json().catch(() => ({}));
          if (r.status === 503 || body.error === "database unavailable") {
            msg =
              "API is running but MongoDB failed. Set MONGO_URI in Vercel → Settings → Environment Variables, and allow your cluster IP in Atlas.";
          } else if (!r.ok) {
            msg = `API returned ${r.status}. Check Vercel → Deployments → Functions logs.`;
          }
        } catch {
          msg = import.meta.env.PROD
            ? "API not reachable. Confirm the Vercel project root is mern-app and redeploy after the latest push."
            : "Could not reach the API. Start it with: cd mern-app/server && npm run dev";
        }
        setError(msg);
      }
    })();
  }, []);

  const refreshSubjects = useCallback(() => {
    api.subjects().then(setSubjects).catch(() => {});
  }, []);

  const go = useCallback((v) => {
    setView(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const totalQ = subjects ? subjects.reduce((s, x) => s + x.questionCount, 0) : 0;

  return (
    <div className="app">
      <Header
        theme={theme}
        onToggleTheme={toggle}
        onHome={() => go({ name: "home" })}
        onSearch={() => go({ name: "search" })}
        onAdmin={() => go({ name: "admin" })}
        showHome={view.name !== "home"}
        streak={store.state.streak.count}
      />
      <main className="main">
        {error && <div className="empty">{error}</div>}
        {!subjects && !error && <div className="loading">Loading content…</div>}

        {subjects && view.name === "home" && (
          <Home subjects={subjects} totalQ={totalQ} onPick={go} dueCount={store.dueKeys().length} store={store} />
        )}

        {subjects && view.name === "notesList" && (
          <SubjectPicker
            subjects={subjects}
            title="Read Notes"
            subtitle="Pick a subject — revision summary or deep-dive teaching notes"
            accent="notes"
            store={store}
            onBack={() => go({ name: "home" })}
            onPick={(subjectId) => go({ name: "notes", subjectId })}
          />
        )}
        {subjects && view.name === "notes" && (
          <NotesReader
            subjectId={view.subjectId}
            subjects={subjects}
            onBack={() => go({ name: "notesList" })}
            onPractice={(subjectId) => go({ name: "studySetup", subjectId })}
          />
        )}

        {subjects && view.name === "studyList" && (
          <SubjectPicker
            subjects={subjects}
            title="Study Mode"
            subtitle="Instant feedback, one question at a time"
            accent="study"
            store={store}
            onBack={() => go({ name: "home" })}
            onPick={(subjectId) => go({ name: "studySetup", subjectId })}
          />
        )}
        {subjects && view.name === "studySetup" && (
          <StudySetup
            subject={subjects.find((s) => s.subjectId === view.subjectId)}
            onBack={() => go({ name: "studyList" })}
            onStart={(cfg) => go({ name: "study", ...cfg })}
          />
        )}
        {subjects && view.name === "study" && (
          <StudyMode
            subject={subjects.find((s) => s.subjectId === view.subjectId)}
            count={view.count}
            order={view.order}
            store={store}
            onBack={() => go({ name: "studySetup", subjectId: view.subjectId })}
            onDone={() => go({ name: "home" })}
          />
        )}

        {subjects && view.name === "examSetup" && (
          <ExamSetup onBack={() => go({ name: "home" })} onStart={(cfg) => go({ name: "exam", ...cfg })} />
        )}
        {subjects && view.name === "exam" && (
          <ExamMode
            time={view.time}
            numQ={view.numQ}
            subjects={subjects}
            store={store}
            onExit={() => go({ name: "home" })}
          />
        )}

        {subjects && view.name === "flash" && (
          <Flashcards subjects={subjects} store={store} onExit={() => go({ name: "home" })} />
        )}

        {subjects && view.name === "search" && (
          <SearchPage
            subjects={subjects}
            onBack={() => go({ name: "home" })}
            onOpenNote={(subjectId) => go({ name: "notes", subjectId })}
          />
        )}

        {subjects && view.name === "dashboard" && (
          <Dashboard subjects={subjects} store={store} onBack={() => go({ name: "home" })} onPick={go} />
        )}

        {subjects && view.name === "admin" && (
          <Admin subjects={subjects} onBack={() => go({ name: "home" })} onChanged={refreshSubjects} />
        )}
      </main>
      <footer className="footer">
        {totalQ} questions · {subjects?.length || 0} subjects · MERN study platform · weighted like the real exit exam
      </footer>
    </div>
  );
}

function Header({ theme, onToggleTheme, onHome, onSearch, onAdmin, showHome, streak }) {
  return (
    <header className="header">
      <button className="brand" onClick={onHome}>
        <span className="brand-mark">SE</span>
        <span className="brand-text">
          Exit&nbsp;Exam
          <em>practice lab</em>
        </span>
      </button>
      <div className="header-actions">
        {streak > 0 && (
          <span className="streak-chip" title="Day streak">
            🔥 {streak}
          </span>
        )}
        <button className="icon-btn" onClick={() => { haptic(); onSearch(); }} title="Search" aria-label="Search">
          🔍
        </button>
        <button className="icon-btn" onClick={onToggleTheme} title="Toggle light / dark" aria-label="Toggle theme">
          {theme === "light" ? "🌙" : "☀️"}
        </button>
        <button className="icon-btn" onClick={() => { haptic(); onAdmin(); }} title="Admin" aria-label="Admin">
          🔒
        </button>
        {showHome && (
          <button className="home-btn" onClick={onHome}>
            ↩ Home
          </button>
        )}
      </div>
    </header>
  );
}
