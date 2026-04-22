/**
 * Drag & drop using SortableJS.
 * @module features/dragdrop
 */

import Sortable from "sortablejs";
import { getState, setState } from "../core/state.js";
import { debouncedSave } from "../core/storage.js";
import { updateTask } from "./tasks.js";

/**
 * Enable drag-and-drop sorting on a task list.
 * Updates the `order` field of affected tasks.
 * @param {HTMLElement} container
 * @param {function():void} [onUpdate]
 * @returns {Sortable}
 */
export function enableTaskSorting(container, onUpdate) {
  return Sortable.create(container, {
    animation: 150,
    ghostClass: "is-dragging",
    handle: ".task-drag-handle",
    onEnd({ oldIndex, newIndex }) {
      if (oldIndex === newIndex) return;
      const taskList = [...(getState("tasks") || [])];
      const visibleIds = Array.from(container.querySelectorAll("[data-id]")).map((el) => el.dataset.id);
      visibleIds.forEach((id, idx) => {
        const task = taskList.find((t) => t.id === id);
        if (task) task.order = idx;
      });
      setState("tasks", taskList);
      debouncedSave(getState());
      onUpdate?.();
    },
  });
}

/**
 * Enable drag-and-drop for Kanban columns.
 * Moving a card changes its completion status.
 * @param {HTMLElement[]} columns  array of column containers
 * @param {Record<string, boolean|string>} colStateMap  colId → completed value
 * @returns {Sortable[]}
 */
export function enableKanbanSorting(columns, colStateMap) {
  return columns.map((col) =>
    Sortable.create(col, {
      group: "kanban",
      animation: 150,
      ghostClass: "is-dragging",
      onAdd({ item, to }) {
        const taskId = item.dataset.id;
        const colId  = to.dataset.col;
        if (!taskId || !colId) return;
        const change = colStateMap[colId];
        if (change !== undefined) {
          updateTask(taskId, {
            completed: change === "done",
            completedAt: change === "done" ? new Date().toISOString() : null,
          });
        }
      },
    })
  );
}

/**
 * Enable sortable on the sidebar category list.
 * @param {HTMLElement} container
 * @returns {Sortable}
 */
export function enableCategorySorting(container) {
  return Sortable.create(container, {
    animation: 150,
    handle: ".sidebar-item",
    onEnd() {
      const cats = [...(getState("categories") || [])];
      Array.from(container.children).forEach((el, idx) => {
        const id = el.dataset.catId;
        const cat = cats.find((c) => c.id === id);
        if (cat) cat.order = idx;
      });
      setState("categories", cats);
      debouncedSave(getState());
    },
  });
}
