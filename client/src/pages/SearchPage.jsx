import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api.js";
import { codeify } from "../lib/markdown.js";

export default function SearchPage({ subjects, onBack, onOpenNote }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState({ notes: [], questions: [] });
  const [loading, setLoading] = useState(false);
  const debounce = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (term.trim().length < 2) {
      setResults({ notes: [], questions: [] });
      return;
    }
    setLoading(true);
    debounce.current = setTimeout(() => {
      api
        .search(term.trim())
        .then(setResults)
        .catch(() => setResults({ notes: [], questions: [] }))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(debounce.current);
  }, [term]);

  const titleOf = Object.fromEntries(subjects.map((s) => [s.subjectId, s.title]));
  const hasResults = results.notes.length || results.questions.length;

  return (
    <div className="search-wrap">
      <button className="back" onClick={onBack}>
        ← Home
      </button>
      <h1 className="page-title">Search</h1>
      <p className="page-sub">Find any term across all {subjects.length} subjects' notes and questions.</p>

      <input
        ref={inputRef}
        className="search-box"
        placeholder="e.g. deadlock, normalization, big-O, TCP handshake…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />

      {loading && <div className="loading">Searching…</div>}

      {!loading && term.trim().length >= 2 && !hasResults && (
        <div className="empty">No matches for “{term}”.</div>
      )}

      {results.notes.length > 0 && (
        <>
          <div className="search-section">Notes ({results.notes.length})</div>
          {results.notes.map((n, i) => (
            <button key={i} className="search-hit" onClick={() => onOpenNote(n.subjectId)}>
              <span className="hit-tag">
                {titleOf[n.subjectId] || n.subjectId} · {n.kind}
              </span>
              <div dangerouslySetInnerHTML={{ __html: codeify(n.title) }} />
              {n.snippet && <div className="hit-snip">…{n.snippet}…</div>}
            </button>
          ))}
        </>
      )}

      {results.questions.length > 0 && (
        <>
          <div className="search-section">Questions ({results.questions.length})</div>
          {results.questions.map((q, i) => (
            <button key={i} className="search-hit" onClick={() => onOpenNote(q.subjectId)}>
              <span className="hit-tag">{titleOf[q.subjectId] || q.subjectId}</span>
              <div dangerouslySetInnerHTML={{ __html: codeify(q.q) }} />
              <div className="hit-snip" dangerouslySetInnerHTML={{ __html: codeify(q.explain || "") }} />
            </button>
          ))}
        </>
      )}
    </div>
  );
}
