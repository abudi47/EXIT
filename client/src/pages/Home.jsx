import { useMemo } from "react";
import { haptic } from "../lib/markdown.js";

export default function Home({ subjects, totalQ, onPick, dueCount, store }) {
  const cards = [
    {
      key: "notesList",
      icon: "📚",
      title: "Read Notes",
      desc: "High-yield revision notes per subject, plus deeper teaching notes. Toggle between them, then jump into practice.",
      tag: "revise",
      cls: "c-notes",
    },
    {
      key: "studyList",
      icon: "📖",
      title: "Study Mode",
      desc: "One question at a time with instant ✓/✗ and an explanation. Star hard ones for later.",
      tag: "learn",
      cls: "c-study",
    },
    {
      key: "examSetup",
      icon: "📝",
      title: "Exam Mode",
      desc: "Timed mock weighted like the real thing. No feedback until you submit — then a full breakdown.",
      tag: "test",
      cls: "c-exam",
    },
    {
      key: "flash",
      icon: "🃏",
      title: "Flashcards",
      desc: "Spaced repetition. Questions you miss come back sooner; mastered ones fade out.",
      tag: "recall",
      cls: "c-flash",
      badge: dueCount > 0 ? `${dueCount} due` : null,
    },
    {
      key: "dashboard",
      icon: "📊",
      title: "My Progress",
      desc: "Best scores, weak-area heatmap, streak and bookmarked questions — all in one place.",
      tag: "track",
      cls: "c-review",
    },
  ];

  // Priority = exam weight × weakness. Unpracticed subjects count as fully weak,
  // so a fresh user gets pure blueprint order (Programming first); once you've
  // drilled, it tilts toward where you're actually losing marks.
  const ranked = useMemo(() => {
    const srs = store?.state.srs || {};
    return subjects
      .map((s) => {
        const prefix = s.subjectId + "::";
        let correct = 0,
          total = 0;
        for (const [k, v] of Object.entries(srs)) {
          if (k.startsWith(prefix)) {
            correct += v.correct;
            total += v.correct + v.wrong;
          }
        }
        const acc = total ? correct / total : null;
        const weakness = acc === null ? 1 : 1 - acc;
        return { s, acc, total, score: s.weight * weakness };
      })
      .sort((a, b) => b.score - a.score || b.s.weight - a.s.weight);
  }, [subjects, store?.state]);

  const top = ranked[0];
  const reason = !top
    ? ""
    : top.total === 0
    ? `Highest-impact subject you haven't started — worth ${top.s.weight}/100 on the exam.`
    : `You're at ${Math.round(top.acc * 100)}% here · ${top.s.weight}/100 marks — your biggest score to gain.`;

  return (
    <div className="home">
      <div className="hero">
        <div className="hero-eyebrow">software engineering · exit exam</div>
        <h1 className="hero-title">
          Drill it until it's <span className="hl">automatic.</span>
        </h1>
        <p className="hero-sub">
          {totalQ} exam-style questions across {subjects.length} subjects — read, study, drill with spaced
          repetition, or sit a weighted mock.
        </p>
      </div>

      {top && (
        <div className="priority-card">
          <div className="priority-eyebrow">▶ study next · blueprint priority</div>
          <div className="priority-main">
            <span className="priority-icon">{top.s.icon}</span>
            <div className="priority-text">
              <h2 className="priority-title">{top.s.title}</h2>
              <p className="priority-why">{reason}</p>
            </div>
            <button
              className="priority-btn"
              onClick={() => {
                haptic();
                onPick({ name: "studySetup", subjectId: top.s.subjectId });
              }}
            >
              Study now →
            </button>
          </div>
          {ranked.length > 1 && (
            <div className="priority-next">
              <span className="priority-next-label">then</span>
              {ranked.slice(1, 4).map(({ s }) => (
                <button
                  key={s.subjectId}
                  className="priority-chip"
                  onClick={() => {
                    haptic();
                    onPick({ name: "studySetup", subjectId: s.subjectId });
                  }}
                >
                  {s.icon} {s.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mode-grid">
        {cards.map((c, k) => (
          <button
            key={c.key}
            className={`mode-card ${c.cls}`}
            style={{ animationDelay: `${k * 80}ms` }}
            onClick={() => {
              haptic();
              onPick({ name: c.key });
            }}
          >
            <div className="mode-icon">{c.icon}</div>
            <div className="mode-tag">{c.tag}</div>
            <h2>{c.title}</h2>
            <p>{c.desc}</p>
            <span className="mode-go">Start →</span>
            {c.badge && <span className="mode-badge">{c.badge}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
