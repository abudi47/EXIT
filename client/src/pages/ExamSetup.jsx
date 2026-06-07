import { useState } from "react";
import { session, EXAM_KEY } from "../lib/session.js";

export default function ExamSetup({ onBack, onStart }) {
  const [time, setTime] = useState(30);
  const [numQ, setNumQ] = useState(50);
  const times = [
    { v: 15, l: "15 min" },
    { v: 30, l: "30 min" },
    { v: 60, l: "60 min" },
    { v: 0, l: "No limit" },
  ];
  const sizes = [25, 50, 100];

  return (
    <div className="setup">
      <button className="back" onClick={onBack}>
        ← Home
      </button>
      <div className="setup-card exam">
        <div className="setup-icon">📝</div>
        <h1>Mock Exit Exam</h1>
        <p className="page-sub">Questions weighted like the real blueprint. No feedback until you submit.</p>

        <div className="opt-group">
          <label>Number of questions</label>
          <div className="pill-row">
            {sizes.map((s) => (
              <button key={s} className={`pill ${numQ === s ? "on" : ""}`} onClick={() => setNumQ(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="opt-group">
          <label>Time limit</label>
          <div className="pill-row">
            {times.map((t) => (
              <button key={t.v} className={`pill ${time === t.v ? "on" : ""}`} onClick={() => setTime(t.v)}>
                {t.l}
              </button>
            ))}
          </div>
        </div>

        <button
          className="primary-btn exam"
          onClick={() => {
            session.del(EXAM_KEY); // fresh exam — drop any resumable session
            onStart({ time, numQ });
          }}
        >
          Start exam →
        </button>
      </div>
    </div>
  );
}
