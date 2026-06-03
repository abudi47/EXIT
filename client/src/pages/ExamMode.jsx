import { useState, useEffect, useMemo } from "react";
import { api } from "../lib/api.js";
import { codeify, shuffle, haptic } from "../lib/markdown.js";
import { useSwipe } from "../lib/hooks.js";
import { qKey } from "../lib/store.js";

// Build a weighted exam set from the full bank, mirroring blueprint weights.
function buildExam(bank, subjects, numQ) {
  const byId = {};
  for (const q of bank) (byId[q.subjectId] ||= []).push(q);
  const totalW = subjects.reduce((s, x) => s + x.weight, 0);
  let chosen = [];
  for (const sub of subjects) {
    const want = Math.max(1, Math.round((sub.weight / totalW) * numQ));
    const pool = shuffle(
      (byId[sub.subjectId] || []).map((q) => ({ ...q, _subj: sub.title, _sid: sub.subjectId }))
    );
    chosen = chosen.concat(pool.slice(0, Math.min(want, pool.length)));
  }
  chosen = shuffle(chosen);
  if (chosen.length > numQ) chosen = chosen.slice(0, numQ);
  return chosen;
}

export default function ExamMode({ time, numQ, subjects, store, onExit }) {
  const [bank, setBank] = useState(null);
  useEffect(() => {
    api.allQuestions().then(setBank);
  }, []);

  const questions = useMemo(
    () => (bank ? buildExam(bank, subjects, numQ) : []),
    [bank, subjects, numQ]
  );

  const [answers, setAnswers] = useState({});
  const [pos, setPos] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [left, setLeft] = useState(time * 60);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (time === 0 || submitted || !bank) return;
    if (left <= 0) {
      setSubmitted(true);
      return;
    }
    const id = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(id);
  }, [left, time, submitted, bank]);

  const pick = (oi) => {
    haptic();
    setAnswers((a) => ({ ...a, [pos]: oi }));
  };
  const answeredCount = Object.keys(answers).length;
  const goPrev = () => pos > 0 && (haptic(), setPos((p) => p - 1));
  const goNext = () => pos + 1 < questions.length && (haptic(), setPos((p) => p + 1));
  const swipe = useSwipe({ onLeft: goNext, onRight: goPrev });

  const doSubmit = () => {
    // Feed every answered exam question into the SRS schedule.
    questions.forEach((q, i) => {
      if (answers[i] !== undefined) {
        store.recordAnswer(qKey(q._sid, q), answers[i] === q.answer);
      }
    });
    const pct = Math.round(
      (questions.filter((q, i) => answers[i] === q.answer).length / Math.max(1, questions.length)) * 100
    );
    store.recordSession("__exam__", pct);
    haptic(20);
    setSubmitted(true);
  };

  if (!bank) return <div className="loading">Building your exam…</div>;

  if (submitted) {
    return <ExamResults questions={questions} answers={answers} onExit={onExit} />;
  }

  const q = questions[pos];
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const lowTime = time > 0 && left <= 60;

  return (
    <div className="runner exam-runner">
      <div className="runner-top">
        <button
          className="back small"
          onClick={() => {
            if (confirm("Leave the exam? Progress will be lost.")) onExit();
          }}
        >
          ← Quit
        </button>
        {time > 0 && (
          <span className={`timer ${lowTime ? "low" : ""}`}>
            ⏱ {mm}:{ss}
          </span>
        )}
        <button className="chip tappable" onClick={() => { haptic(); setNavOpen(true); }}>
          {answeredCount}/{questions.length} ▦
        </button>
      </div>
      <div className="progress">
        <div className="progress-bar exam" style={{ width: `${((pos + 1) / questions.length) * 100}%` }} />
      </div>
      <div className="q-counter">
        Question {pos + 1} of {questions.length} <span className="subj-tag">{q._subj}</span>
      </div>
      <div className="q-card swipeable" key={pos} {...swipe}>
        <h2 className="q-text" dangerouslySetInnerHTML={{ __html: codeify(q.q) }} />
        <div className="options">
          {q.options.map((opt, oi) => (
            <button
              key={oi}
              className={`option ${answers[pos] === oi ? "selected" : ""}`}
              onClick={() => pick(oi)}
            >
              <span className="opt-letter">{String.fromCharCode(65 + oi)}</span>
              <span className="opt-body" dangerouslySetInnerHTML={{ __html: codeify(opt) }} />
              {answers[pos] === oi && <span className="opt-mark">●</span>}
            </button>
          ))}
        </div>
        <div className="swipe-hint center">← swipe between questions →</div>
      </div>
      <div className="thumb-bar exam-bar">
        <button className="nav-btn" disabled={pos === 0} onClick={goPrev}>
          ←
        </button>
        {pos + 1 < questions.length ? (
          <button className="nav-btn grow" onClick={goNext}>
            Next →
          </button>
        ) : (
          <button
            className="nav-btn submit grow"
            onClick={() => confirm(`Submit? ${answeredCount}/${questions.length} answered.`) && doSubmit()}
          >
            Submit ✓
          </button>
        )}
        <button className="nav-btn" onClick={() => { haptic(); setNavOpen(true); }}>
          ▦
        </button>
      </div>

      {navOpen && (
        <div className="sheet-overlay" onClick={() => setNavOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grip" />
            <div className="sheet-head">
              <span>Jump to question</span>
              <button className="sheet-close" onClick={() => setNavOpen(false)}>
                ✕
              </button>
            </div>
            <div className="dot-grid big">
              {questions.map((_, qi) => (
                <button
                  key={qi}
                  className={`dot ${qi === pos ? "cur" : ""} ${answers[qi] !== undefined ? "done" : ""}`}
                  onClick={() => {
                    haptic();
                    setPos(qi);
                    setNavOpen(false);
                  }}
                >
                  {qi + 1}
                </button>
              ))}
            </div>
            <button
              className="nav-btn submit full"
              onClick={() => confirm(`Submit? ${answeredCount}/${questions.length} answered.`) && doSubmit()}
            >
              Submit exam ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExamResults({ questions, answers, onExit }) {
  const [review, setReview] = useState(false);
  const total = questions.length;
  let correct = 0;
  const bySubj = {};
  questions.forEach((q, i) => {
    const ok = answers[i] === q.answer;
    if (ok) correct++;
    if (!bySubj[q._subj]) bySubj[q._subj] = { c: 0, t: 0 };
    bySubj[q._subj].t++;
    if (ok) bySubj[q._subj].c++;
  });
  const pct = Math.round((correct / total) * 100);
  const pass = pct >= 50;
  const subjRows = Object.entries(bySubj).sort((a, b) => a[1].c / a[1].t - b[1].c / b[1].t);

  if (review) return <ReviewMode questions={questions} answers={answers} onBack={() => setReview(false)} onExit={onExit} />;

  return (
    <div className="results">
      <div className={`score-hero ${pass ? "pass" : "fail"}`}>
        <div className="score-ring" style={{ "--pct": pct }}>
          <span className="score-num">
            {pct}
            <small>%</small>
          </span>
        </div>
        <div className="verdict">{pass ? "PASS" : "KEEP GOING"}</div>
        <p className="score-line">
          {correct} of {total} correct
        </p>
      </div>
      <h2 className="section-h">Score by subject — your weak areas first</h2>
      <div className="subj-breakdown">
        {subjRows.map(([name, v]) => {
          const p = Math.round((v.c / v.t) * 100);
          const tier = p >= 70 ? "good" : p >= 50 ? "mid" : "weak";
          return (
            <div className="brk-row" key={name}>
              <span className="brk-name">{name}</span>
              <div className="brk-track">
                <div className={`brk-fill ${tier}`} style={{ width: `${p}%` }} />
              </div>
              <span className="brk-val">
                {v.c}/{v.t}
              </span>
            </div>
          );
        })}
      </div>
      <div className="results-actions">
        <button className="primary-btn exam" onClick={() => setReview(true)}>
          Review answers →
        </button>
        <button className="ghost-btn" onClick={onExit}>
          Back home
        </button>
      </div>
    </div>
  );
}

function ReviewMode({ questions, answers, onBack, onExit }) {
  const [filter, setFilter] = useState("all");
  const rows = questions.map((q, i) => ({ q, i, ok: answers[i] === q.answer, ans: answers[i] }));
  const shown = rows.filter((r) => (filter === "all" ? true : filter === "wrong" ? !r.ok : r.ok));

  return (
    <div className="review">
      <div className="runner-top">
        <button className="back small" onClick={onBack}>
          ← Score
        </button>
        <div className="filter-row">
          {["all", "wrong", "correct"].map((f) => (
            <button key={f} className={`pill sm ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>
      {shown.map(({ q, i, ok, ans }) => (
        <div className={`rev-card ${ok ? "ok" : "bad"}`} key={i}>
          <div className="rev-head">
            <span className="rev-tag">{q._subj}</span>
            <span className="rev-mark">{ok ? "✓" : "✗"}</span>
          </div>
          <p className="rev-q" dangerouslySetInnerHTML={{ __html: codeify(q.q) }} />
          <div className="rev-opts">
            {q.options.map((opt, oi) => {
              let cls = "rev-opt";
              if (oi === q.answer) cls += " correct";
              else if (oi === ans) cls += " wrong";
              return (
                <div key={oi} className={cls}>
                  <b>{String.fromCharCode(65 + oi)}</b>
                  <span dangerouslySetInnerHTML={{ __html: codeify(opt) }} />
                  {oi === q.answer && " ✓"}
                  {oi === ans && oi !== q.answer && " ← you"}
                </div>
              );
            })}
            {ans === undefined && <div className="rev-skip">Not answered</div>}
          </div>
          <div className="rev-explain" dangerouslySetInnerHTML={{ __html: codeify(q.explain) }} />
        </div>
      ))}
      <button className="ghost-btn full" onClick={onExit}>
        Back home
      </button>
    </div>
  );
}
