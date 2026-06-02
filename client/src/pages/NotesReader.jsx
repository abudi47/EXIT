import { useState, useEffect, useMemo } from "react";
import { api } from "../lib/api.js";
import { renderMarkdown } from "../lib/markdown.js";

export default function NotesReader({ subjectId, subjects, onBack, onPractice }) {
  const subject = subjects.find((s) => s.subjectId === subjectId);
  const hasDeep = subject?.noteKinds?.includes("deepdive");
  const [kind, setKind] = useState("revision");
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .note(subjectId, kind)
      .then((n) => alive && setNote(n))
      .catch(() => alive && setNote(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [subjectId, kind]);

  const html = useMemo(() => (note ? renderMarkdown(note.md) : ""), [note]);

  return (
    <div className="notes-reader">
      <button className="back" onClick={onBack}>
        ← All subjects
      </button>

      <div className="view-toggle">
        <button className={kind === "revision" ? "on" : ""} onClick={() => setKind("revision")}>
          📝 Revision
        </button>
        <button
          className={kind === "deepdive" ? "on" : ""}
          disabled={!hasDeep}
          title={hasDeep ? "" : "No deep-dive note for this subject yet"}
          onClick={() => hasDeep && setKind("deepdive")}
        >
          📚 Deep dive{hasDeep ? "" : " (none)"}
        </button>
      </div>

      <button className="practice-cta" onClick={() => onPractice(subjectId)}>
        Practice this subject ▶
      </button>

      {loading ? (
        <div className="loading">Loading notes…</div>
      ) : note ? (
        <article className="prose" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div className="empty">No notes found for this subject.</div>
      )}

      <button className="practice-cta bottom" onClick={() => onPractice(subjectId)}>
        Practice this subject ▶
      </button>
    </div>
  );
}
