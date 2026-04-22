/**
 * Tag CRUD.
 * @module features/tags
 */

import { getState, setState, tags } from "../core/state.js";
import { debouncedSave } from "../core/storage.js";
import { toastSuccess } from "../ui/toast.js";
import { confirm } from "../ui/confirm.js";
import { i18n } from "../config.js";

/**
 * Add a new tag (no-op if already exists).
 * @param {string} name
 */
export function addTag(name) {
  const clean = name.trim().replace(/^#/, "");
  if (!clean || tags().includes(clean)) return;
  setState("tags", [...tags(), clean]);
  debouncedSave(getState());
}

/**
 * Rename a tag everywhere.
 * @param {string} oldName
 * @param {string} newName
 */
export function renameTag(oldName, newName) {
  const clean = newName.trim().replace(/^#/, "");
  if (!clean) return;
  setState("tags", tags().map((t) => t === oldName ? clean : t));
  const updatedTasks = (getState("tasks") || []).map((task) => ({
    ...task,
    tags: (task.tags || []).map((t) => t === oldName ? clean : t),
  }));
  setState("tasks", updatedTasks);
  debouncedSave(getState());
}

/**
 * Delete a tag everywhere.
 * @param {string} name
 */
export async function deleteTag(name) {
  const ok = await confirm(`"#${name}" teqi silinsin? Bütün tasklardan da silinəcək.`, i18n.delete);
  if (!ok) return;
  setState("tags", tags().filter((t) => t !== name));
  const updatedTasks = (getState("tasks") || []).map((task) => ({
    ...task,
    tags: (task.tags || []).filter((t) => t !== name),
  }));
  setState("tasks", updatedTasks);
  debouncedSave(getState());
  toastSuccess(i18n.taskDeleted);
}
