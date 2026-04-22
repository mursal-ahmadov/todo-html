/**
 * Recurring task helpers.
 * @module features/recurring
 */

import { nextRecurring } from "../utils/date.js";

/**
 * Check if a task has recurring configured.
 * @param {object} task
 * @returns {boolean}
 */
export function isRecurring(task) {
  return !!task.recurring && task.recurring !== "none";
}

/**
 * Produce the next occurrence of a recurring task.
 * Clears `completed`, `completedAt`, resets `id`, and advances `dueAt`.
 * @param {object} task
 * @returns {object}
 */
export function buildNextOccurrence(task) {
  if (!isRecurring(task) || !task.dueAt) return null;
  const nextDue = nextRecurring(new Date(task.dueAt), task.recurring);
  if (!nextDue) return null;
  return {
    ...task,
    id:          crypto.randomUUID?.() ?? String(Date.now()),
    completed:   false,
    completedAt: null,
    dueAt:       nextDue.toISOString(),
    reminderAt:  task.reminderAt
      ? (() => {
          const diff = new Date(task.dueAt) - new Date(task.reminderAt);
          return new Date(nextDue.getTime() - diff).toISOString();
        })()
      : null,
  };
}
