// In dev, Vite proxies /api -> :4000. On Vercel, same-origin /api hits the serverless API.
const BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

async function get(path) {
  const r = await fetch(BASE + path);
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

async function put(path, body) {
  const r = await fetch(BASE + path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

// Admin POST: returns parsed JSON for BOTH success and validation errors so the
// UI can show field-level messages (only throws on network/server failure).
async function adminPost(path, body, token) {
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-token": token },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await r.json();
  } catch (e) {}
  if (r.status >= 500) throw new Error(`server error (${r.status})`);
  return { status: r.status, data };
}

export const api = {
  subjects: () => get("/subjects"),
  questions: (subjectId) => get(`/subjects/${subjectId}/questions`),
  allQuestions: () => get("/questions"),
  note: (subjectId, kind) => get(`/notes/${subjectId}?kind=${kind}`),
  search: (q) => get(`/search?q=${encodeURIComponent(q)}`),
  loadProgress: (deviceId) => get(`/progress/${deviceId}`),
  saveProgress: (deviceId, body) => put(`/progress/${deviceId}`, body),

  // admin
  adminPing: async (token) => {
    const r = await fetch(BASE + "/admin/ping", {
      headers: { "x-admin-token": token },
    });
    return r.ok;
  },
  uploadQuestions: (data, token) => adminPost("/admin/upload/questions", data, token),
  uploadNote: (body, token) => adminPost("/admin/upload/note", body, token),
};
