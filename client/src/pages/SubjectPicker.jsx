import { haptic } from "../lib/markdown.js";

export default function SubjectPicker({ subjects, title, subtitle, accent, store, onBack, onPick }) {
  return (
    <div className="picker">
      <button className="back" onClick={onBack}>
        ← Back
      </button>
      <h1 className={`page-title acc-${accent}`}>{title}</h1>
      <p className="page-sub">{subtitle}</p>
      <div className="subject-grid">
        {subjects.map((s, i) => {
          const best = store?.state.subjectStats[s.subjectId]?.best;
          const hasDeep = s.noteKinds?.includes("deepdive");
          return (
            <button
              key={s.subjectId}
              className={`subj-card acc-${accent}`}
              style={{ animationDelay: `${i * 25}ms` }}
              onClick={() => {
                haptic();
                onPick(s.subjectId);
              }}
            >
              {hasDeep && accent === "notes" && <span className="subj-deep">deep-dive</span>}
              <span className="subj-icon">{s.icon}</span>
              <span className="subj-name">{s.title}</span>
              <span className="subj-meta">
                {s.questionCount} Q · weight {s.weight}
              </span>
              {best > 0 && <span className="subj-best">best {best}%</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
