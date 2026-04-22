/**
 * Task CRUD operations and rendering.
 * @module features/tasks
 */

import { getState, setState, tasks, categories } from "../core/state.js";
import { debouncedSave } from "../core/storage.js";
import { generateId } from "../utils/id.js";
import { relativeDue, dueDateClass, isToday, isOverdue, isWithinDays, nextRecurring } from "../utils/date.js";
import { escapeHtml, truncate } from "../utils/format.js";
import { el, clearChildren, delegate } from "../utils/dom.js";
import { toastSuccess, toastError } from "../ui/toast.js";
import { confirm } from "../ui/confirm.js";
import { emptyState } from "../ui/empty.js";
import { i18n, TRASH_RETAIN_DAYS } from "../config.js";
import { openTaskModal } from "./taskModal.js";

/**
 * Create a new task object with defaults.
 * @param {Partial<object>} overrides
 * @returns {object}
 */
export function createTask(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: "",
    notes: "",
    completed: false,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    dueDate: null,
    reminderAt: null,
    categoryId: null,
    tags: [],
    recurring: { type: "none", interval: 1, daysOfWeek: [], endDate: null, nextOccurrence: null },
    order: 0,
    archivedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

/**
 * Add a task to state and persist.
 * @param {object} task
 */
export function addTask(task) {
  const list = [...tasks(), task];
  setState("tasks", list);
  debouncedSave(getState());
  toastSuccess(i18n.taskAdded);
}

/**
 * Update an existing task by id.
 * @param {string} id
 * @param {Partial<object>} changes
 */
export function updateTask(id, changes) {
  const list = tasks().map((t) =>
    t.id === id ? { ...t, ...changes, updatedAt: new Date().toISOString() } : t
  );
  setState("tasks", list);
  debouncedSave(getState());
}

/**
 * Soft-delete: set deletedAt.
 * @param {string} id
 */
export async function deleteTask(id) {
  const ok = await confirm(i18n.confirmDelete, i18n.delete);
  if (!ok) return;
  updateTask(id, { deletedAt: new Date().toISOString() });
  toastSuccess(i18n.taskDeleted);
}

/**
 * Restore a soft-deleted task.
 * @param {string} id
 */
export function restoreTask(id) {
  updateTask(id, { deletedAt: null, archivedAt: null });
  toastSuccess(i18n.taskRestored);
}

/**
 * Archive a task.
 * @param {string} id
 */
export function archiveTask(id) {
  updateTask(id, { archivedAt: new Date().toISOString() });
  toastSuccess(i18n.taskArchived);
}

/**
 * Toggle task completion. Handles streak update and recurring.
 * @param {string} id
 */
export function toggleComplete(id) {
  const task = tasks().find((t) => t.id === id);
  if (!task) return;

  if (!task.completed) {
    // Mark completed
    updateTask(id, { completed: true, completedAt: new Date().toISOString() });
    updateStreak();
    playSound("complete");

    // Handle recurring
    if (task.recurring?.type !== "none" && task.dueDate) {
      const nextDate = nextRecurring(task.recurring, task.dueDate);
      if (nextDate) {
        const next = createTask({
          ...task,
          id: generateId(),
          completed: false,
          completedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          dueDate: nextDate,
          recurring: { ...task.recurring, nextOccurrence: nextDate },
        });
        addTask(next);
      }
    }
    toastSuccess(i18n.taskCompleted);
  } else {
    updateTask(id, { completed: false, completedAt: null });
  }
}

/**
 * Duplicate a task.
 * @param {string} id
 */
export function duplicateTask(id) {
  const task = tasks().find((t) => t.id === id);
  if (!task) return;
  const dup = createTask({ ...task, id: generateId(), createdAt: new Date().toISOString() });
  addTask(dup);
}

/**
 * Hard-delete tasks older than TRASH_RETAIN_DAYS.
 */
export function purgeOldTrash() {
  const cutoff = Date.now() - TRASH_RETAIN_DAYS * 24 * 60 * 60 * 1000;
  const list = tasks().filter((t) => {
    if (!t.deletedAt) return true;
    return new Date(t.deletedAt).getTime() > cutoff;
  });
  if (list.length !== tasks().length) {
    setState("tasks", list);
    debouncedSave(getState());
  }
}

/**
 * Update streak counter after a task completion.
 */
function updateStreak() {
  const st = getState("stats") || {};
  const today = new Date().toISOString().slice(0, 10);
  const last  = st.lastCompletedDate;

  let streak = st.streak || 0;
  if (last === today) {
    // Already completed today — just bump total
  } else {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    streak = last === yesterday ? streak + 1 : 1;
  }

  const longest = Math.max(st.longestStreak || 0, streak);
  setState("stats", {
    ...st,
    streak,
    longestStreak: longest,
    lastCompletedDate: today,
    totalCompleted: (st.totalCompleted || 0) + 1,
  });
}

/**
 * Play a sound effect if sounds are enabled.
 * @param {"complete"|"pomodoro-end"} name
 */
export function playSound(name) {
  const settings = getState("settings") || {};
  if (!settings.soundEnabled) return;
  const audio = new Audio(`/todo-html/assets/sounds/${name}.mp3`);
  audio.volume = 0.5;
  audio.play().catch(() => {}); // Ignore autoplay policy errors
}

// ── RENDERING ────────────────────────────────────────────────

/**
 * Get category by id.
 * @param {string|null} id
 * @returns {object|undefined}
 */
function getCat(id) {
  return categories().find((c) => c.id === id);
}

/**
 * Build a task card element.
 * @param {object} task
 * @returns {HTMLElement}
 */
export function renderTaskCard(task) {
  const card = el("div", {
    class: `task-card glass-card${task.completed ? " completed" : ""}`,
    "data-id": task.id,
    draggable: "true",
  });

  // Drag handle
  const dragHandle = el("span", { class: "task-drag-handle", "aria-hidden": "true" });
  dragHandle.innerHTML = `<svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor">
    <circle cx="4" cy="3" r="1.5"/><circle cx="8" cy="3" r="1.5"/>
    <circle cx="4" cy="9" r="1.5"/><circle cx="8" cy="9" r="1.5"/>
    <circle cx="4" cy="15" r="1.5"/><circle cx="8" cy="15" r="1.5"/>
  </svg>`;

  // Checkbox
  const cb = el("button", {
    class: `task-checkbox${task.completed ? " checked" : ""}`,
    "aria-label": task.completed ? "Tamamlanmış olaraq işarələ" : "Tamamla",
    "aria-pressed": String(task.completed),
    type: "button",
  });
  const tick = el("span", { class: "task-checkbox__tick", "aria-hidden": "true" });
  tick.innerHTML = `<svg viewBox="0 0 12 10" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="1 5 4.5 9 11 1"/>
  </svg>`;
  cb.appendChild(tick);
  cb.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleComplete(task.id);
  });

  // Body
  const body = el("div", { class: "task-body" });
  const titleEl = el("div", { class: "task-title" });
  titleEl.textContent = truncate(task.title, 120);
  body.appendChild(titleEl);

  // Meta row
  const meta = el("div", { class: "task-meta" });

  if (task.dueDate) {
    const dueEl = el("span", { class: `task-due ${dueDateClass(task.dueDate)}` });
    dueEl.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg> ${escapeHtml(relativeDue(task.dueDate))}`;
    meta.appendChild(dueEl);
  }

  if (task.categoryId) {
    const cat = getCat(task.categoryId);
    if (cat) {
      const catBadge = el("span", {
        class: "task-category-badge",
        style: `background:${escapeHtml(cat.color)}22;color:${escapeHtml(cat.color)}`,
      });
      catBadge.textContent = `${cat.icon || ""} ${cat.name}`;
      meta.appendChild(catBadge);
    }
  }

  for (const tag of (task.tags || []).slice(0, 3)) {
    const tagEl = el("span", { class: "task-tag" });
    tagEl.textContent = `#${tag}`;
    meta.appendChild(tagEl);
  }

  if (meta.children.length) body.appendChild(meta);

  // Actions (⋮ menu)
  const actionsWrap = el("div", { class: "task-actions" });
  const menuBtn = el("button", {
    class: "btn-icon",
    "aria-label": "Task seçimləri",
    "aria-haspopup": "true",
    type: "button",
  });
  menuBtn.textContent = "⋮";
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showTaskMenu(task, menuBtn);
  });
  actionsWrap.appendChild(menuBtn);

  card.append(dragHandle, cb, body, actionsWrap);

  // Click opens detail modal
  card.addEventListener("click", () => openTaskModal(task));

  return card;
}

/**
 * Show context menu for a task.
 * @param {object} task
 * @param {HTMLElement} anchor
 */
function showTaskMenu(task, anchor) {
  // Remove any existing dropdown
  document.querySelector(".task-dropdown")?.remove();

  const menu = el("div", { class: "dropdown task-dropdown", role: "menu" });

  const items = [
    { label: "✏️ " + i18n.edit,       action: () => openTaskModal(task) },
    { label: "📋 Kopyala",             action: () => duplicateTask(task.id) },
    { label: "📦 Arxivləşdir",         action: () => archiveTask(task.id) },
    { separator: true },
    { label: "🗑 " + i18n.delete,     action: () => deleteTask(task.id), cls: "danger" },
  ];

  for (const item of items) {
    if (item.separator) {
      menu.appendChild(el("div", { class: "dropdown-separator", role: "separator" }));
      continue;
    }
    const div = el("div", { class: `dropdown-item${item.cls ? " " + item.cls : ""}`, role: "menuitem", tabindex: "0" });
    div.textContent = item.label;
    div.addEventListener("click", () => { menu.remove(); item.action(); });
    menu.appendChild(div);
  }

  // Position relative to anchor
  const wrap = el("div", { style: "position:relative;display:inline-block;" });
  anchor.parentNode.insertBefore(wrap, anchor);
  wrap.appendChild(anchor);
  wrap.appendChild(menu);

  // Close on outside click
  const close = (e) => {
    if (!menu.contains(e.target) && e.target !== anchor) {
      menu.remove();
      wrap.replaceWith(anchor);
      document.removeEventListener("click", close);
    }
  };
  setTimeout(() => document.addEventListener("click", close), 0);
}

/**
 * Filter tasks for a section.
 * @param {"today"|"week"|"overdue"|"all"|"completed"|{categoryId?:string,tag?:string}} filter
 * @returns {object[]}
 */
export function filterTasks(filter) {
  const active = tasks().filter((t) => !t.deletedAt && !t.archivedAt);

  if (filter === "today")     return active.filter((t) => !t.completed && isToday(t.dueDate));
  if (filter === "week")      return active.filter((t) => !t.completed && isWithinDays(t.dueDate, 7));
  if (filter === "overdue")   return active.filter((t) => !t.completed && isOverdue(t.dueDate));
  if (filter === "completed") return active.filter((t) => t.completed);
  if (filter === "all")       return active.filter((t) => !t.completed);

  if (filter?.categoryId) return active.filter((t) => !t.completed && t.categoryId === filter.categoryId);
  if (filter?.tag)        return active.filter((t) => !t.completed && (t.tags || []).includes(filter.tag));

  return active.filter((t) => !t.completed);
}

/**
 * Render a filtered task list into a container.
 * @param {HTMLElement} container
 * @param {object[]} list
 */
export function renderTaskList(container, list) {
  clearChildren(container);
  if (!list.length) {
    container.appendChild(
      emptyState({ icon: "✓", title: i18n.noTasks, subtitle: "Yeni task əlavə et!" })
    );
    return;
  }
  const sorted = [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const task of sorted) {
    container.appendChild(renderTaskCard(task));
  }
}

/**
 * Count tasks for badge display.
 * @param {"today"|"week"|"overdue"|"all"} filter
 * @returns {number}
 */
export function countTasks(filter) {
  return filterTasks(filter).length;
}
