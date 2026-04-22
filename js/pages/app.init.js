/**
 * app.html initialisation — Main task management page.
 * @module pages/app.init
 */

import { guardRoute } from "../core/router.js";
import { loadData } from "../core/storage.js";
import { initState, getState, setState, subscribe } from "../core/state.js";
import { loadTheme } from "../features/theme.js";
import { injectNav } from "../ui/nav.js";
import {
  renderTaskList, filterTasks, countTasks, addTask,
} from "../features/tasks.js";
import { openTaskModal } from "../features/taskModal.js";
import { openCategoryModal } from "../features/categories.js";
import { enableTaskSorting, enableCategorySorting } from "../features/dragdrop.js";
import { registerShortcuts } from "../features/shortcuts.js";
import { bindSearchInput } from "../features/search.js";
import { scheduleReminders, showNotificationBanner } from "../features/notifications.js";
import { showSkeletons } from "../ui/loader.js";
import { toastError } from "../ui/toast.js";
import { $, $$, el } from "../utils/dom.js";
import { i18n } from "../config.js";

guardRoute();
loadTheme();
injectNav("app.html");
registerShortcuts();

const taskContainer  = document.getElementById("task-list");
const quickInput     = document.getElementById("quick-input");
const quickAddBtn    = document.getElementById("quick-add-btn");
const sidebarEl      = document.getElementById("sidebar");
const viewBtns       = $$("[data-view]");
const searchInput    = document.getElementById("search-input");
const addCategoryBtn = document.getElementById("add-category-btn");

let currentFilter = "today";
let currentView   = localStorage.getItem("app-view") || "list";
let dragInstance  = null;

// ── Boot
(async () => {
  if (!taskContainer) return;
  showSkeletons(taskContainer, 4);
  try {
    const data = await loadData();
    initState(data);
    renderAll();
    scheduleReminders();
    showNotificationBanner(() => scheduleReminders());
  } catch (err) {
    toastError(err.message || i18n.errorUnknown);
  }
})();

// ── Subscribe to task/category changes
subscribe("tasks",      () => renderAll());
subscribe("categories", () => { renderSidebar(); renderAll(); });

// ── Render task list
function renderAll() {
  if (!taskContainer) return;
  const list = filterTasks(currentFilter);
  renderTaskList(taskContainer, list, currentView);
  if (dragInstance) { dragInstance.destroy(); dragInstance = null; }
  if (currentView === "list") {
    dragInstance = enableTaskSorting(taskContainer);
  }
  updateSidebarCounts();
}

// ── Render sidebar
function renderSidebar() {
  const catList = document.getElementById("sidebar-category-list");
  if (!catList) return;
  catList.innerHTML = "";
  const categories = getState("categories") || [];
  for (const cat of [...categories].sort((a, b) => a.order - b.order)) {
    const item = el("button", {
      class: `sidebar-item${currentFilter === cat.id ? " active" : ""}`,
      "data-cat-id": cat.id,
    });
    item.innerHTML = `
      <span class="sidebar-item-icon" style="color:${cat.color}">${cat.icon}</span>
      <span class="sidebar-item-label">${cat.name}</span>
      <span class="sidebar-item-count">${countTasks(cat.id)}</span>
    `;
    item.addEventListener("click", () => setFilter(cat.id));
    catList.appendChild(item);
  }
  enableCategorySorting(catList);
}

function updateSidebarCounts() {
  const filters = ["today","week","overdue","all","completed"];
  for (const f of filters) {
    const el = document.querySelector(`[data-filter="${f}"] .sidebar-item-count`);
    if (el) el.textContent = countTasks(f);
  }
}

// ── Filter from sidebar
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-filter]");
  if (btn) setFilter(btn.dataset.filter);
});

function setFilter(filter) {
  currentFilter = filter;
  $$("[data-filter]").forEach((b) => b.classList.toggle("active", b.dataset.filter === filter));
  $$("[data-cat-id]", sidebarEl).forEach((b) => b.classList.toggle("active", b.dataset.catId === filter));
  renderAll();
}

// ── View toggle (list / kanban / calendar)
viewBtns.forEach((btn) => {
  btn.classList.toggle("active", btn.dataset.view === currentView);
  btn.addEventListener("click", () => {
    currentView = btn.dataset.view;
    localStorage.setItem("app-view", currentView);
    viewBtns.forEach((b) => b.classList.toggle("active", b.dataset.view === currentView));
    renderAll();
  });
});

// ── Quick-add
quickInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTaskFromQuick();
});
quickAddBtn?.addEventListener("click", addTaskFromQuick);

async function addTaskFromQuick() {
  const title = quickInput?.value.trim();
  if (!title) { quickInput?.classList.add("animate-shake"); return; }
  await addTask({ rawTitle: title });
  quickInput.value = "";
}

// ── Search
if (searchInput) {
  bindSearchInput(searchInput, taskContainer, (results) => {
    if (results === null) renderAll();
    else renderTaskList(taskContainer, results);
  });
}

// ── Add category button
addCategoryBtn?.addEventListener("click", () =>
  openCategoryModal(null, () => renderSidebar())
);

// ── FAB: new task
document.getElementById("fab-new-task")?.addEventListener("click", () => openTaskModal());

// Initial sidebar render
renderSidebar();
