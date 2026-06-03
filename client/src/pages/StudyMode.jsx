import { useState, useEffect, useMemo } from "react";
import { api } from "../lib/api.js";
import { codeify, shuffle, haptic } from "../lib/markdown.js";
import { useSwipe } from "../lib/hooks.js";
import { qKey } from "../lib/store.js";

export default function StudyMode({ subject, count, order, store, onBack, onDone }) {
  const [all, setAll] = useState(null);

  useEffect(() => {
    api.questions(subject.subjectId).then(setAll);
  }, [subject.subjectId]);

  const questions = useMemo(() => {
    if (!all) return [];
    let qs = all.map((q, qi) => ({ ...q, _i: qi }));
    if (order === "shuffle") qs = shuffle(qs);
    return qs.slice(0, count);
  }, [all, count, order]);

  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [seen, setSeen] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[pos];
  const answered = picked !== null || revealed;
  const key = q ? qKey(subject.subjectId, q) : null;

  const choose = (oi) => {
    if (answered || !q) return;
    const ok = oi === q.answer;
    haptic(ok ? 10 : [18, 30, 18]);
    setPicked(oi);
    setSeen((s) => s + 1);
    if (ok) setCorrect((c) => c + 1);
    store.recordAnswer(key, ok);
  };

  const reveal = () => {
    if (!answered) {
      haptic();
      setRevealed(true);
      setSeen((s) => s + 1);
      store.recordAnswer(key, false);
    }
  };

  const next = () => {
    if (pos + 1 >= questions.length) {
      const pct = Math.round((correct / Math.max(1, questions.length)) * 100);
      store.recordSession(subject.subjectId, pct);
      setDone(true);
      return;
    }
    setPos((p) => p + 1);
    setPicked(null);
    setRevealed(false);
  };

  const swipe = useSwipe({ onLeft: () => answered && next() });

  if (!all) return <div className="loading">Loading questions…</div>;

  if (done) {
    const pct = Math.round((correct / Math.max(1, questions.length)) * 100);
    return (
      <div className="results">
        <div className={`score-hero ${pct >= 50 ? "pass" : "fail"}`}>
          <div className="score-ring" style={{ "--pct": pct }}>
            <span className="score-num">
              {pct}
              <small>%</small>
            </span>
          </div>
          <div className="verdict">{correct}/{questions.length}</div>
          <p className="score-line">Nice work on {subject.title}.</p>
        </div>
        <div className="results-actions">
          <button className="primary-btn study" onClick={onBack}>
            Study again
          </button>
          <button className="ghost-btn" onClick={onDone}>
            Back home
          </button>
        </div>
      </div>
    );
  }

  const pct = Math.round((pos / questions.length) * 100);

  return (
    <div className="runner study-runner" {...swipe}>
      <div className="runner-top">
        <button className="back small" onClick={onBack}>
          ← Exit
        </button>
        <div className="runner-meta">
          <span className="chip">{subject.title}</span>
          <span className="chip score">✓ {correct}/{seen}</span>
        </div>
      </div>
      <div className="progress">
        <div className="progress-bar study" style={{ width: `${pct}%` }} />
      </div>
      <div className="q-counter">
        Question {pos + 1} of {questions.length}
      </div>
      <div className="q-card" key={pos}>
        <div className="q-head">
          <h2 className="q-text" dangerouslySetInnerHTML={{ __html: codeify(q.q) }} />
          <button
            className={`star-btn ${store.isBookmarked(key) ? "on" : ""}`}
            title="Bookmark this question"
            onClick={() => {
              haptic();
              store.toggleBookmark(key);
            }}
          >
            {store.isBookmarked(key) ? "★" : "☆"}
          </button>
        </div>
        <div className="options">
          {q.options.map((opt, oi) => {
            let cls = "option";
            if (answered) {
              if (oi === q.answer) cls += " correct";
              else if (oi === picked) cls += " wrong";
              else cls += " dim";
            }
            return (
              <button key={oi} className={cls} disabled={answered} onClick={() => choose(oi)}>
                <span className="opt-letter">{String.fromCharCode(65 + oi)}</span>
                <span className="opt-body" dangerouslySetInnerHTML={{ __html: codeify(opt) }} />
                {answered && oi === q.answer && <span className="opt-mark">✓</span>}
                {answered && oi === picked && oi !== q.answer && <span className="opt-mark">✗</span>}
              </button>
            );
          })}
        </div>
        {answered && (
          <div className={`explain ${picked === q.answer ? "ok" : revealed && picked === null ? "neutral" : "bad"}`}>
            <strong>
              {picked === q.answer ? "Correct!" : revealed && picked === null ? "Answer revealed." : "Not quite."}
            </strong>
            <span dangerouslySetInnerHTML={{ __html: codeify(q.explain) }} />
          </div>
        )}
      </div>
      {!answered ? (
        <div className="thumb-bar">
          <button className="reveal-btn wide" onClick={reveal}>
            👁 Reveal answer
          </button>
        </div>
      ) : (
        <div className="thumb-bar">
          <span className="swipe-hint">swipe ← or tap</span>
          <button className="primary-btn study bar" onClick={next}>
            {pos + 1 >= questions.length ? "Finish ✓" : "Next →"}
          </button>
        </div>
      )}
    </div>
  );
}
