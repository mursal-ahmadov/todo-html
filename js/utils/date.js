/**
 * Date utility helpers using dayjs (loaded via import map).
 * @module utils/date
 */

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isTodayPlugin from "dayjs/plugin/isToday";
import isTomorrowPlugin from "dayjs/plugin/isTomorrow";
import weekOfYear from "dayjs/plugin/weekOfYear";
import "dayjs/locale/az";

dayjs.extend(relativeTime);
dayjs.extend(isTodayPlugin);
dayjs.extend(isTomorrowPlugin);
dayjs.extend(weekOfYear);
dayjs.locale("az");

/**
 * Return a human-readable relative label for a due date.
 * @param {string|Date|null} dateStr
 * @returns {string}
 */
export function relativeDue(dateStr) {
  if (!dateStr) return "";
  const d = dayjs(dateStr);
  const now = dayjs();
  if (d.isBefore(now, "minute")) return "gecikmiş";
  if (d.isToday()) return "bu gün " + d.format("HH:mm");
  if (d.isTomorrow()) return "sabah " + d.format("HH:mm");
  const diffDays = d.diff(now, "day");
  if (diffDays < 7) return d.format("dddd HH:mm");
  return d.format("D MMM HH:mm");
}

/**
 * Return CSS class for due date styling.
 * @param {string|null} dateStr
 * @returns {"overdue"|"today"|"soon"|""}
 */
export function dueDateClass(dateStr) {
  if (!dateStr) return "";
  const d = dayjs(dateStr);
  const now = dayjs();
  if (d.isBefore(now, "minute")) return "overdue";
  if (d.isToday()) return "today";
  if (d.diff(now, "day") <= 3) return "soon";
  return "";
}

/**
 * Format ISO string to "D MMM YYYY".
 * @param {string} iso
 * @returns {string}
 */
export function formatDate(iso) {
  return dayjs(iso).format("D MMM YYYY");
}

/**
 * Format ISO string to datetime-local input value.
 * @param {string} iso
 * @returns {string}
 */
export function toInputDatetime(iso) {
  return dayjs(iso).format("YYYY-MM-DDTHH:mm");
}

/**
 * Parse a natural-language task string for due date.
 * Handles: "sabah", "bu gün", "gələn həftə", HH:mm, "DD.MM"
 * @param {string} text
 * @returns {{title: string, dueDate: string|null, tags: string[], categoryHint: string|null}}
 */
export function parseTaskNaturalLanguage(text) {
  let title = text.trim();
  let dueDate = null;
  const tags = [];
  let categoryHint = null;

  // Extract tags: #tag
  title = title.replace(/#([\w\u0400-\u04FF\u0041-\u005A\u0061-\u007AığışüöçəÜÖÇƏĞIŞ]+)/gu, (_, tag) => {
    tags.push(tag);
    return "";
  }).trim();

  // Extract category hint: @cat
  title = title.replace(/@([\w\u0400-\u04FF\u0041-\u005A\u0061-\u007AığışüöçəÜÖÇƏĞIŞ]+)/gu, (_, cat) => {
    categoryHint = cat;
    return "";
  }).trim();

  const now = dayjs();

  // Keywords
  if (/\bbu gün\b/i.test(title)) {
    dueDate = now.endOf("day").toISOString();
    title = title.replace(/\bbu gün\b/i, "").trim();
  } else if (/\bsabah\b/i.test(title)) {
    dueDate = now.add(1, "day").endOf("day").toISOString();
    title = title.replace(/\bsabah\b/i, "").trim();
  } else if (/\bgələn həftə\b/i.test(title)) {
    dueDate = now.add(1, "week").startOf("week").toISOString();
    title = title.replace(/\bgələn həftə\b/i, "").trim();
  }

  // Time HH:mm
  const timeMatch = title.match(/\b(\d{1,2}):(\d{2})\b/);
  if (timeMatch) {
    const base = dueDate ? dayjs(dueDate) : now;
    dueDate = base.hour(parseInt(timeMatch[1], 10)).minute(parseInt(timeMatch[2], 10)).second(0).toISOString();
    title = title.replace(timeMatch[0], "").trim();
  }

  return { title: title || text.trim(), dueDate, tags, categoryHint };
}

/**
 * Check if a date string is today.
 * @param {string|null} iso
 * @returns {boolean}
 */
export function isToday(iso) {
  return !!iso && dayjs(iso).isToday();
}

/**
 * Check if a date is in the past.
 * @param {string|null} iso
 * @returns {boolean}
 */
export function isOverdue(iso) {
  if (!iso) return false;
  return dayjs(iso).isBefore(dayjs(), "minute");
}

/**
 * Check if a date falls within the next N days.
 * @param {string|null} iso
 * @param {number} days
 * @returns {boolean}
 */
export function isWithinDays(iso, days) {
  if (!iso) return false;
  const d = dayjs(iso);
  return d.isAfter(dayjs()) && d.isBefore(dayjs().add(days, "day").endOf("day"));
}

/**
 * Get start of today as ISO string.
 * @returns {string}
 */
export function todayStart() {
  return dayjs().startOf("day").toISOString();
}

/**
 * Calculate next occurrence for a recurring task.
 * @param {object} recurring
 * @param {string} fromDate  ISO date to compute from
 * @returns {string|null}
 */
export function nextRecurring(recurring, fromDate) {
  if (!recurring || recurring.type === "none") return null;
  const from = dayjs(fromDate);
  let next;
  switch (recurring.type) {
    case "daily":
      next = from.add(recurring.interval || 1, "day");
      break;
    case "weekly":
      next = from.add(recurring.interval || 1, "week");
      break;
    case "monthly":
      next = from.add(recurring.interval || 1, "month");
      break;
    default:
      return null;
  }
  if (recurring.endDate && next.isAfter(dayjs(recurring.endDate))) return null;
  return next.toISOString();
}
