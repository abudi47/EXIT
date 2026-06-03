import { useMemo } from "react";

export default function Dashboard({ subjects, store, onBack, onPick }) {
  const { subjectStats, srs, streak, bookmarks } = store.state;

  const stats = useMemo(() => {
    const srsVals = Object.values(srs);
    const reviewed = srsVals.length;
    const mastered = srsVals.filter((v) => v.box >= 4).length;
    const due = store.dueKeys().length;
    const bookmarked = Object.values(bookmarks).filter(Boolean).length;
    const examStat = subjectStats["__exam__"];
    return { reviewed, mastered, due, bookmarked, examBest: examStat?.best || 0 };
  }, [srs, bookmarks, subjectStats]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-subject mastery from SRS performance, for the heatmap.
  const subjRows = subjects.map((s) => {
    const prefix = s.subjectId + "::";
    const entries = Object.entries(srs).filter(([k]) => k.startsWith(prefix));
    let correct = 0,
      total = 0;
    for (const [, v] of entries) {
      correct += v.correct;
      total += v.correct + v.wrong;
    }
    const best = subjectStats[s.subjectId]?.best || 0;
    const pct = total ? Math.round((correct / total) * 100) : null;
    return { s, pct, best, seen: total };
  });

  const ranked = [...subjRows].sort((a, b) => {
    const av = a.pct ?? -1,
      bv = b.pct ?? -1;
    return av - bv;
  });

  return (
    <div className="search-wrap">
      <button className="back" onClick={onBack}>
        ← Home
      </button>
      <h1 className="page-title">My Progress</h1>
      <p className="page-sub">Everything is saved on this device and synced when the server is up.</p>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-num">🔥 {streak.count}</div>
          <div className="stat-label">day streak</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.reviewed}</div>
          <div className="stat-label">questions seen</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.mastered}</div>
          <div className="stat-label">mastered</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.due}</div>
          <div className="stat-label">due to review</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.examBest}%</div>
          <div className="stat-label">best mock exam</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.bookmarked}</div>
          <div className="stat-label">bookmarked</div>
        </div>
      </div>

      {stats.due > 0 && (
        <button className="practice-cta" onClick={() => onPick({ name: "flash" })}>
          Review {stats.due} due card{stats.due === 1 ? "" : "s"} now ▶
        </button>
      )}

      <h2 className="section-h">Mastery by subject — weakest first</h2>
      <div className="subj-breakdown">
        {ranked.map(({ s, pct, best, seen }) => {
          const shown = pct ?? 0;
          const tier = pct === null ? "mid" : pct >= 70 ? "good" : pct >= 50 ? "mid" : "weak";
          return (
            <div className="brk-row" key={s.subjectId} style={{ cursor: "pointer" }}
              onClick={() => onPick({ name: "studySetup", subjectId: s.subjectId })}>
              <span className="brk-name">
                {s.icon} {s.title}
              </span>
              <div className="brk-track">
                <div className={`brk-fill ${tier}`} style={{ width: `${shown}%` }} />
              </div>
              <span className="brk-val">
                {pct === null ? "—" : `${pct}%`}
                {best > 0 ? ` · ${best}%` : ""}
              </span>
            </div>
          );
        })}
      </div>
      <p className="page-sub" style={{ marginTop: 14, fontSize: 13 }}>
        Left value = how you answer it in drills · right value = best Study-Mode score. Tap a row to practise it.
      </p>
    </div>
  );
}
