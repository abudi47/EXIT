import { useState } from "react";
import { session, STUDY_KEY } from "../lib/session.js";

export default function StudySetup({ subject, onBack, onStart }) {
  const [count, setCount] = useState(10);
  const [order, setOrder] = useState("shuffle");
  const max = subject.questionCount;
  const counts = [10, 20, max].filter((v, i, a) => a.indexOf(v) === i && v <= max);

  return (
    <div className="setup">
      <button className="back" onClick={onBack}>
        ← Subjects
      </button>
      <div className="setup-card">
        <div className="setup-icon">{subject.icon}</div>
        <h1>{subject.title}</h1>
        <p className="page-sub">{max} questions available</p>

        <div className="opt-group">
          <label>How many?</label>
          <div className="pill-row">
            {counts.map((c) => (
              <button key={c} className={`pill ${count === c ? "on" : ""}`} onClick={() => setCount(c)}>
                {c === max ? `All ${max}` : c}
              </button>
            ))}
          </div>
        </div>

        <div className="opt-group">
          <label>Order</label>
          <div className="pill-row">
            <button className={`pill ${order === "shuffle" ? "on" : ""}`} onClick={() => setOrder("shuffle")}>
              🔀 Shuffled
            </button>
            <button className={`pill ${order === "order" ? "on" : ""}`} onClick={() => setOrder("order")}>
              📑 In order
            </button>
          </div>
        </div>

        <button
          className="primary-btn study"
          onClick={() => {
            session.del(STUDY_KEY); // fresh run — drop any resumable session
            onStart({ subjectId: subject.subjectId, count: Math.min(count, max), order });
          }}
        >
          Begin study →
        </button>
      </div>
    </div>
  );
}
