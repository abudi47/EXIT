import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "./api";

const LS_KEY = "se_exit_progress_v1";
const DEVICE_KEY = "se_exit_device_id";

// Stable per-browser id (so server sync can key on it without login).
export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = "dev_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyState = () => ({
  srs: {}, // key "subjectId::qhash" -> { box, due, seen, correct, wrong }
  bookmarks: {}, // key -> true
  subjectStats: {}, // subjectId -> { best, attempts, lastScore }
  streak: { count: 0, lastDay: "" },
});

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...emptyState(), ...JSON.parse(raw) };
  } catch (e) {}
  return emptyState();
}

// A short stable key for a question (id if present, else hashed text).
export function qKey(subjectId, q) {
  const base = q._id || q.q || "";
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) | 0;
  return `${subjectId}::${h}`;
}

// Leitner spacing: box N becomes due in 2^(N-1) days. Box 1 = today.
const BOX_DAYS = [0, 1, 2, 4, 8, 16];
function nextDue(box) {
  const days = BOX_DAYS[Math.min(box, BOX_DAYS.length - 1)];
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function useStore() {
  const [state, setState] = useState(load);
  const deviceId = useRef(getDeviceId());
  const syncTimer = useRef(null);
  const hydrated = useRef(false);

  // One-time hydration: pull any server-side progress and merge it in BEFORE
  // we start syncing. Without this, a freshly cleared browser would push empty
  // state up and clobber progress saved from another device.
  useEffect(() => {
    let alive = true;
    api
      .loadProgress(deviceId.current)
      .then((remote) => {
        if (!alive || !remote) return;
        setState((local) => {
          // Merge: keep the higher SRS box / stats, union bookmarks.
          const srs = { ...remote.srs, ...local.srs };
          for (const k of Object.keys(remote.srs || {})) {
            if (local.srs[k] && (remote.srs[k]?.box || 0) > (local.srs[k]?.box || 0)) {
              srs[k] = remote.srs[k];
            }
          }
          const bookmarks = { ...local.bookmarks };
          for (const k of remote.bookmarks || []) bookmarks[k] = true;
          const subjectStats = { ...remote.subjectStats };
          for (const [id, v] of Object.entries(local.subjectStats)) {
            const r = remote.subjectStats?.[id];
            subjectStats[id] = r
              ? { ...v, best: Math.max(v.best, r.best || 0), attempts: Math.max(v.attempts, r.attempts || 0) }
              : v;
          }
          const streak =
            (remote.streak?.lastDay || "") > (local.streak.lastDay || "") ? remote.streak : local.streak;
          return { srs, bookmarks, subjectStats, streak };
        });
      })
      .catch(() => {}) // offline — local is fine
      .finally(() => {
        hydrated.current = true;
      });
    return () => {
      alive = false;
    };
  }, []);

  // Persist to localStorage immediately; debounce server sync (after hydration).
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
    if (!hydrated.current) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      api
        .saveProgress(deviceId.current, {
          srs: state.srs,
          bookmarks: Object.keys(state.bookmarks).filter((k) => state.bookmarks[k]),
          subjectStats: state.subjectStats,
          streak: state.streak,
        })
        .catch(() => {}); // offline is fine — localStorage is source of truth
    }, 1200);
  }, [state]);

  const toggleBookmark = useCallback((key) => {
    setState((s) => ({
      ...s,
      bookmarks: { ...s.bookmarks, [key]: !s.bookmarks[key] },
    }));
  }, []);

  const isBookmarked = useCallback((key) => !!state.bookmarks[key], [state]);

  // Record an answer into the SRS schedule.
  const recordAnswer = useCallback((key, correct) => {
    setState((s) => {
      const prev = s.srs[key] || { box: 1, due: todayStr(), seen: 0, correct: 0, wrong: 0 };
      const box = correct ? Math.min(prev.box + 1, BOX_DAYS.length) : 1;
      return {
        ...s,
        srs: {
          ...s.srs,
          [key]: {
            box,
            due: nextDue(box),
            seen: prev.seen + 1,
            correct: prev.correct + (correct ? 1 : 0),
            wrong: prev.wrong + (correct ? 0 : 1),
          },
        },
      };
    });
  }, []);

  // Record a finished study/exam session for a subject + bump the daily streak.
  const recordSession = useCallback((subjectId, scorePct) => {
    setState((s) => {
      const prev = s.subjectStats[subjectId] || { best: 0, attempts: 0, lastScore: 0 };
      const today = todayStr();
      let streak = s.streak;
      if (s.streak.lastDay !== today) {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        const cont = s.streak.lastDay === y.toISOString().slice(0, 10);
        streak = { count: cont ? s.streak.count + 1 : 1, lastDay: today };
      }
      return {
        ...s,
        subjectStats: {
          ...s.subjectStats,
          [subjectId]: {
            best: Math.max(prev.best, scorePct),
            attempts: prev.attempts + 1,
            lastScore: scorePct,
          },
        },
        streak,
      };
    });
  }, []);

  // Questions currently due for review (across all subjects).
  const dueKeys = useCallback(() => {
    const today = todayStr();
    return Object.entries(state.srs)
      .filter(([, v]) => v.due <= today && v.wrong + v.correct > 0)
      .map(([k]) => k);
  }, [state]);

  return {
    state,
    deviceId: deviceId.current,
    toggleBookmark,
    isBookmarked,
    recordAnswer,
    recordSession,
    dueKeys,
  };
}
