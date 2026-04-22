/**
 * Theme management — dark / light / auto.
 * @module features/theme
 */

import { STORAGE_KEYS } from "../config.js";

/**
 * Apply a theme and optionally persist it.
 * @param {"auto"|"light"|"dark"} theme
 * @param {boolean} [persist=false]
 */
export function applyTheme(theme, persist = false) {
  const root = document.documentElement;
  if (theme === "auto") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
  if (persist) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }
}

/**
 * Load saved theme from localStorage and apply it.
 * Falls back to "auto".
 */
export function loadTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.THEME) || "auto";
  applyTheme(saved);
}

/**
 * Get current effective theme ("dark"|"light").
 * @returns {"dark"|"light"}
 */
export function currentTheme() {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
