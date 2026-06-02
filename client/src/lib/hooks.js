import { useState, useEffect, useRef, useCallback } from "react";
import { haptic } from "./markdown";

const THEME_KEY = "se_exit_theme";

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f7f2e9" : "#14110f");
  }, [theme]);

  const toggle = useCallback(() => {
    haptic();
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, []);

  return { theme, toggle };
}

// Swipe-gesture hook: returns props to spread on a container.
export function useSwipe({ onLeft, onRight, threshold = 55 }) {
  const start = useRef(null);
  const moved = useRef(0);
  return {
    onTouchStart: (e) => {
      start.current = e.touches[0].clientX;
      moved.current = 0;
    },
    onTouchMove: (e) => {
      if (start.current != null) moved.current = e.touches[0].clientX - start.current;
    },
    onTouchEnd: () => {
      const dx = moved.current;
      start.current = null;
      moved.current = 0;
      if (Math.abs(dx) < threshold) return;
      if (dx < 0 && onLeft) {
        haptic();
        onLeft();
      } else if (dx > 0 && onRight) {
        haptic();
        onRight();
      }
    },
  };
}
