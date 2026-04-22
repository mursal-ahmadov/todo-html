/**
 * Formatting helpers.
 * @module utils/format
 */

/**
 * Format a number with thousand separators.
 * @param {number} n
 * @returns {string}
 */
export function formatNumber(n) {
  return new Intl.NumberFormat("az-AZ").format(n);
}

/**
 * Format minutes as "Xd Xh Xm".
 * @param {number} minutes
 * @returns {string}
 */
export function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes}d`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}s`;
  return `${h}s ${m}d`;
}

/**
 * Format seconds as MM:SS for the Pomodoro timer.
 * @param {number} seconds
 * @returns {string}
 */
export function formatTimer(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * Percentage string, clamped 0-100.
 * @param {number} value
 * @param {number} total
 * @returns {string}
 */
export function formatPercent(value, total) {
  if (!total) return "0%";
  return `${Math.round(Math.min(100, (value / total) * 100))}%`;
}

/**
 * Escape HTML special chars to prevent XSS when injecting into innerHTML.
 * Prefer textContent whenever possible; use this only when HTML is needed.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Truncate a string to maxLength, appending "…" if truncated.
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(str, maxLength) {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength).trimEnd() + "…";
}
