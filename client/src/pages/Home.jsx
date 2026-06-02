import { haptic } from "../lib/markdown.js";

export default function Home({ subjects, totalQ, onPick, dueCount }) {
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
