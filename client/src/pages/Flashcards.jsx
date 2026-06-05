import { useState, useEffect, useMemo } from "react";
import { api } from "../lib/api.js";
import { codeify, shuffle, haptic } from "../lib/markdown.js";
import { qKey } from "../lib/store.js";

// Spaced-repetition drill. Pulls questions whose SRS due-date has arrived;
// if nothing is due yet, seeds a fresh mix so there's always something to do.
export default function Flashcards({ subjects, store, onExit }) {
  const [bank, setBank] = useState(null);

  useEffect(() => {
    api.allQuestions().then(setBank);
  }, []);

  const deck = useMemo(() => {
    if (!bank) return [];
    const titleOf = Object.fromEntries(subjects.map((s) => [s.subjectId, s.title]));
    const withKey = bank.map((q) => ({
      ...q,
      _subj: titleOf[q.subjectId] || q.subjectId,
      _key: qKey(q.subjectId, q),
    }));
    const due = new Set(store.dueKeys());
    let chosen = withKey.filter((q) => due.has(q._key));
    if (chosen.length === 0) {
      // Nothing scheduled yet — seed with a fresh shuffled mix to start the SRS.
      chosen = shuffle(withKey).slice(0, 20);
    } else {
      chosen = shuffle(chosen).slice(0, 30);
    }
    return chosen;
  }, [bank]); // eslint-disable-line react-hooks/exhaustive-deps

  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [graded, setGraded] = useState(0);

  if (!bank) return <div className="loading">Loading your review deck…</div>;
  if (deck.length === 0)
    return (
      <div className="empty">
        Nothing to review yet — do a round of Study Mode first, then your misses will appear here.
        <div style={{ marginTop: 18 }}>
          <button className="ghost-btn" onClick={onExit}>
            Back home
          </button>
        </div>
      </div>
    );

  if (pos >= deck.length) {
    return (
      <div className="results">
        <div className="score-hero pass">
          <div className="score-ring" style={{ "--pct": 100 }}>
            <span className="score-num">🃏</span>
          </div>
          <div className="verdict">DONE</div>
          <p className="score-line">Reviewed {graded} cards. They're rescheduled by how well you knew them.</p>
        </div>
        <div className="results-actions">
          <button className="primary-btn flash" onClick={onExit}>
            Back home
          </button>
        </div>
      </div>
    );
  }

  const q = deck[pos];
  const grade = (knewIt) => {
    haptic(knewIt ? 10 : [18, 30, 18]);
    store.recordAnswer(q._key, knewIt);
    setGraded((g) => g + 1);
    setFlipped(false);
    setPos((p) => p + 1);
  };

  const pct = Math.round((pos / deck.length) * 100);

  return (
    <div className="runner">
      <div className="runner-top">
        <button className="back small" onClick={onExit}>
          ← Exit
        </button>
        <div className="runner-meta">
          <span className="chip">🃏 Flashcards</span>
          <span className="chip score">{pos}/{deck.length}</span>
        </div>
      </div>
      <div className="progress">
        <div className="progress-bar flash" style={{ width: `${pct}%` }} />
      </div>
      <div className="q-counter">
        Card {pos + 1} of {deck.length} <span className="subj-tag">{q._subj}</span>
      </div>

      <div className="q-card" key={pos}>
        <h2 className="q-text" dangerouslySetInnerHTML={{ __html: codeify(q.q) }} />
        {!flipped ? (
          <div className="thumb-bar">
            <button className="reveal-btn wide" onClick={() => { haptic(); setFlipped(true); }}>
              👁 Show answer
            </button>
          </div>
        ) : (
          <>
            <div className="options">
              {q.options.map((opt, oi) => (
                <div key={oi} className={`option ${oi === q.answer ? "correct" : "dim"}`}>
                  <span className="opt-letter">{String.fromCharCode(65 + oi)}</span>
                  <span className="opt-body" dangerouslySetInnerHTML={{ __html: codeify(opt) }} />
                  {oi === q.answer && <span className="opt-mark">✓</span>}
                </div>
              ))}
            </div>
            <div className="explain ok">
              <strong>Answer</strong>
              <span dangerouslySetInnerHTML={{ __html: codeify(q.explain) }} />
              {q.tags?.includes("verify") && (
                <span className="verify-badge" title="Inferred answer — no official key in the source exam.">
                  ⚠ unverified answer
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {flipped && (
        <div className="thumb-bar exam-bar">
          <button className="nav-btn grow" onClick={() => grade(false)}>
            ✗ Missed it
          </button>
          <button className="nav-btn submit grow" onClick={() => grade(true)}>
            ✓ Knew it
          </button>
        </div>
      )}
    </div>
  );
}
