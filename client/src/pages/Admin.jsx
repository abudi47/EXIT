import { useState, useEffect } from "react";
import { api } from "../lib/api.js";
import { renderMarkdown, haptic } from "../lib/markdown.js";

const TOKEN_KEY = "se_exit_admin_token";

export default function Admin({ subjects, onBack, onChanged }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  // Re-verify any saved token on mount.
  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    api
      .adminPing(token)
      .then((ok) => setAuthed(ok))
      .finally(() => setChecking(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (checking) return <div className="loading">Checking…</div>;
  if (!authed)
    return (
      <Login
        token={token}
        setToken={setToken}
        onSuccess={() => {
          localStorage.setItem(TOKEN_KEY, token);
          setAuthed(true);
        }}
        onBack={onBack}
      />
    );

  return (
    <div className="admin">
      <div className="runner-top">
        <button className="back small" onClick={onBack}>
          ← Home
        </button>
        <button
          className="ghost-btn"
          onClick={() => {
            localStorage.removeItem(TOKEN_KEY);
            setAuthed(false);
            setToken("");
          }}
        >
          Log out
        </button>
      </div>
      <h1 className="page-title">Admin · Content</h1>
      <p className="page-sub">
        Upload new questions or notes. Each upload is validated, saved to MongoDB, and written back to the
        source folder so re-imports stay in sync.
      </p>

      <QuestionUpload token={token} onChanged={onChanged} />
      <NoteUpload token={token} subjects={subjects} onChanged={onChanged} />

      <h2 className="section-h">Current subjects</h2>
      <div className="subj-breakdown">
        {subjects.map((s) => (
          <div className="brk-row" key={s.subjectId}>
            <span className="brk-name">
              {s.icon} {s.title} <code>{s.subjectId}</code>
            </span>
            <span className="brk-val">{s.questionCount} Q</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Login({ token, setToken, onSuccess, onBack }) {
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const ok = await api.adminPing(token).catch(() => false);
    setBusy(false);
    if (ok) {
      haptic();
      onSuccess();
    } else {
      setErr("Wrong password (must match ADMIN_TOKEN in .env).");
    }
  };

  return (
    <div className="setup">
      <button className="back" onClick={onBack}>
        ← Home
      </button>
      <form className="setup-card" onSubmit={submit}>
        <div className="setup-icon">🔒</div>
        <h1>Admin access</h1>
        <p className="page-sub">Enter the admin password to manage content.</p>
        <div className="opt-group">
          <label>Password</label>
          <input
            className="search-box"
            type="password"
            value={token}
            autoFocus
            onChange={(e) => setToken(e.target.value)}
            placeholder="ADMIN_TOKEN"
          />
        </div>
        {err && <div className="upload-msg bad">{err}</div>}
        <button className="primary-btn study" type="submit" disabled={busy || !token}>
          {busy ? "Checking…" : "Unlock →"}
        </button>
      </form>
    </div>
  );
}

function QuestionUpload({ token, onChanged }) {
  const [parsed, setParsed] = useState(null);
  const [clientErrors, setClientErrors] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const ingest = (text) => {
    setResult(null);
    setParsed(null);
    setClientErrors([]);
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      setClientErrors([`Not valid JSON: ${e.message}`]);
      return;
    }
    const errs = validateQuestions(data);
    if (errs.length) {
      setClientErrors(errs);
      return;
    }
    setParsed(data);
  };

  const onFile = async (file) => {
    if (!file) return;
    ingest(await file.text());
  };

  const save = async () => {
    if (!parsed) return;
    setBusy(true);
    const { status, data } = await api.uploadQuestions(parsed, token).catch(() => ({
      status: 0,
      data: { errors: ["Network/server error — is the API running?"] },
    }));
    setBusy(false);
    if (status === 200 && data?.ok) {
      haptic(15);
      setResult({ ok: true, msg: `Saved ${data.count} questions to “${data.subjectId}”.`, warn: data.diskWarning });
      setParsed(null);
      onChanged?.();
    } else {
      setClientErrors(data?.errors || ["Upload failed."]);
    }
  };

  return (
    <div className="upload-card">
      <h2>📝 Upload questions (.json)</h2>
      <p className="page-sub">
        Same shape as <code>quiz/data/*.json</code>: <code>{`{ id, subject, weight, questions: [ { q, options, answer, explain } ] }`}</code>.
        Replaces all questions for that subject id.
      </p>

      <FileDrop accept=".json,application/json" onFile={onFile} label="Drop a .json file or click to choose" />

      {clientErrors.length > 0 && (
        <div className="upload-msg bad">
          <strong>Fix {clientErrors.length} issue{clientErrors.length > 1 ? "s" : ""}:</strong>
          <ul>
            {clientErrors.slice(0, 12).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {clientErrors.length > 12 && <li>…and {clientErrors.length - 12} more</li>}
          </ul>
        </div>
      )}

      {parsed && (
        <div className="upload-preview">
          <div className="upload-msg ok">
            Ready: <strong>{parsed.subject}</strong> (<code>{parsed.id}</code>) · {parsed.questions.length} questions
          </div>
          <button className="primary-btn study" disabled={busy} onClick={save}>
            {busy ? "Saving…" : `Save ${parsed.questions.length} questions →`}
          </button>
        </div>
      )}

      {result?.ok && (
        <div className="upload-msg ok">
          ✓ {result.msg}
          {result.warn && <div className="upload-msg bad" style={{ marginTop: 8 }}>⚠ {result.warn}</div>}
        </div>
      )}
    </div>
  );
}

function NoteUpload({ token, subjects, onChanged }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.subjectId || "");
  const [kind, setKind] = useState("revision");
  const [md, setMd] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file) => {
    if (!file) return;
    setResult(null);
    setMd(await file.text());
  };

  const save = async () => {
    if (!md.trim()) return;
    setBusy(true);
    const { status, data } = await api
      .uploadNote({ subjectId, kind, md }, token)
      .catch(() => ({ status: 0, data: { errors: ["Network/server error."] } }));
    setBusy(false);
    if (status === 200 && data?.ok) {
      haptic(15);
      setResult({ ok: true, msg: `Saved “${data.title}” (${data.kind}).`, warn: data.diskWarning });
      onChanged?.();
    } else {
      setResult({ ok: false, msg: (data?.errors || ["Upload failed."]).join(" · ") });
    }
  };

  return (
    <div className="upload-card">
      <h2>📚 Upload a note (.md)</h2>
      <p className="page-sub">Markdown for a subject. The title is taken from the first <code># heading</code>.</p>

      <div className="opt-group">
        <label>Subject</label>
        <select className="search-box" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          {subjects.map((s) => (
            <option key={s.subjectId} value={s.subjectId}>
              {s.title} ({s.subjectId})
            </option>
          ))}
        </select>
      </div>

      <div className="opt-group">
        <label>Type</label>
        <div className="pill-row">
          <button className={`pill ${kind === "revision" ? "on" : ""}`} onClick={() => setKind("revision")}>
            📝 Revision
          </button>
          <button className={`pill ${kind === "deepdive" ? "on" : ""}`} onClick={() => setKind("deepdive")}>
            📚 Deep dive
          </button>
        </div>
      </div>

      <FileDrop accept=".md,.markdown,text/markdown" onFile={onFile} label="Drop a .md file or click to choose" />
      <textarea
        className="search-box"
        style={{ minHeight: 120, marginTop: 12, fontFamily: "var(--mono)", fontSize: 13 }}
        placeholder="…or paste markdown here"
        value={md}
        onChange={(e) => setMd(e.target.value)}
      />

      {md.trim() && (
        <details className="upload-preview-details">
          <summary>Preview</summary>
          <article className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }} />
        </details>
      )}

      <button className="primary-btn study" disabled={busy || !md.trim()} onClick={save}>
        {busy ? "Saving…" : "Save note →"}
      </button>

      {result && (
        <div className={`upload-msg ${result.ok ? "ok" : "bad"}`}>
          {result.ok ? "✓ " : "✗ "}
          {result.msg}
          {result.warn && <div className="upload-msg bad" style={{ marginTop: 8 }}>⚠ {result.warn}</div>}
        </div>
      )}
    </div>
  );
}

function FileDrop({ accept, onFile, label }) {
  const [over, setOver] = useState(false);
  return (
    <label
      className={`file-drop ${over ? "over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFile(e.dataTransfer.files[0]);
      }}
    >
      <input type="file" accept={accept} hidden onChange={(e) => onFile(e.target.files[0])} />
      <span>⬆ {label}</span>
    </label>
  );
}

// Mirror of the server-side validation so the user sees errors instantly.
function validateQuestions(data) {
  const errors = [];
  if (!data || typeof data !== "object") return ["File is not a JSON object."];
  const id = typeof data.id === "string" ? data.id.trim() : "";
  if (!id) errors.push('missing top-level "id" (the subjectId)');
  else if (!/^[a-z0-9_]+$/i.test(id)) errors.push('"id" may only contain letters, digits, underscores');
  if (!data.subject || typeof data.subject !== "string") errors.push('missing "subject" title');
  if (!Array.isArray(data.questions) || data.questions.length === 0)
    errors.push('"questions" must be a non-empty array');
  if (Array.isArray(data.questions)) {
    data.questions.forEach((q, i) => {
      const at = `question[${i}]`;
      if (!q || typeof q.q !== "string" || !q.q.trim()) errors.push(`${at}: missing "q" text`);
      if (!Array.isArray(q.options) || q.options.length < 2) errors.push(`${at}: needs ≥2 "options"`);
      else if (q.options.some((o) => typeof o !== "string")) errors.push(`${at}: options must be strings`);
      if (!Number.isInteger(q.answer)) errors.push(`${at}: "answer" must be an integer index`);
      else if (Array.isArray(q.options) && (q.answer < 0 || q.answer >= q.options.length))
        errors.push(`${at}: "answer" ${q.answer} out of range`);
    });
  }
  return errors;
}
