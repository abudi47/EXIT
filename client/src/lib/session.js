// Lightweight localStorage persistence so an accidental refresh resumes you
// exactly where you were (current screen + in-progress quiz/exam).
export const session = {
  get(k) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
  del(k) {
    try {
      localStorage.removeItem(k);
    } catch {}
  },
};

export const VIEW_KEY = "se_exit_view";
export const STUDY_KEY = "se_exit_session_study";
export const EXAM_KEY = "se_exit_session_exam";
