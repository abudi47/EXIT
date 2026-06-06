import { useState, useEffect, useMemo, useRef } from "react";
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
  // Per-question answer state, keyed by position, so going back/forward restores it.
  const [responses, setResponses] = useState({}); // { [pos]: { picked: number|null, revealed: bool } }
  const [done, setDone] = useState(false);
  const recorded = useRef(new Set()); // positions already fed to spaced repetition (record once)

  const q = questions[pos];
  const key = q ? qKey(subject.subjectId, q) : null;
  const cur = responses[pos] || null;
  const picked = cur ? cur.picked : null;
  const revealed = cur ? cur.revealed : false;
  const answered = cur !== null;

  // Score is derived from responses so revisiting a question never double-counts.
  const seen = Object.keys(responses).length;
  const correct = Object.entries(responses).filter(
    ([p, r]) => r.picked !== null && r.picked === questions[Number(p)]?.answer
  ).length;

  const recordOnce = (ok) => {
    if (!recorded.current.has(pos)) {
      recorded.current.add(pos);
      store.recordAnswer(key, ok);
    }
  };

  const choose = (oi) => {
    if (answered || !q) return;
    const ok = oi === q.answer;
    haptic(ok ? 10 : [18, 30, 18]);
    setResponses((r) => ({ ...r, [pos]: { picked: oi, revealed: false } }));
    recordOnce(ok);
  };

  const reveal = () => {
    if (answered) return;
    haptic();
    setResponses((r) => ({ ...r, [pos]: { picked: null, revealed: true } }));
    recordOnce(false);
  };

  // Hide the answer again so you can re-attempt this question.
  // (Spaced repetition already recorded this question once, so re-answering
  //  after peeking won't game your review schedule.)
  const hide = () => {
    haptic();
    setResponses((r) => {
      const copy = { ...r };
      delete copy[pos];
      return copy;
    });
  };

  const prev = () => {
    if (pos > 0) {
      haptic();
      setPos((p) => p - 1);
    }
  };

  const next = () => {
    if (pos + 1 < questions.length) {
      haptic();
      setPos((p) => p + 1);
    }
  };

  const finish = () => {
    const pct = Math.round((correct / Math.max(1, questions.length)) * 100);
    store.recordSession(subject.subjectId, pct);
    haptic(20);
    setDone(true);
  };

  const swipe = useSwipe({ onLeft: next, onRight: prev });

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

  const pct = Math.round(((pos + 1) / questions.length) * 100);
  const isLast = pos + 1 >= questions.length;

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
            {q.tags?.includes("verify") && (
              <span className="verify-badge" title="This answer was inferred from an exam without an official key — double-check it.">
                ⚠ unverified answer
              </span>
            )}
          </div>
        )}
      </div>

      <div className="thumb-bar exam-bar">
        <button className="nav-btn" onClick={prev} disabled={pos === 0} title="Previous">
          ←
        </button>
        {!answered ? (
          <button className="reveal-btn" onClick={reveal}>
            👁 Reveal
          </button>
        ) : (
          <button className="reveal-btn" onClick={hide} title="Hide the answer and try this question again">
            🙈 Hide
          </button>
        )}
        {isLast ? (
          <button className="nav-btn submit grow" onClick={finish}>
            Finish ✓
          </button>
        ) : (
          <button className="nav-btn grow" onClick={next}>
            Next →
          </button>
        )}
      </div>
      <div className="swipe-hint center">← swipe between questions →</div>
    </div>
  );
}
