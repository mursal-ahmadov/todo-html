/**
 * archive.html initialisation.
 * @module pages/archive.init
 */

import { guardRoute } from "../core/router.js";
import { loadData } from "../core/storage.js";
import { initState, getState, setState, subscribe } from "../core/state.js";
import { debouncedSave } from "../core/storage.js";
import { loadTheme } from "../features/theme.js";
import { injectNav } from "../ui/nav.js";
import { confirm } from "../ui/confirm.js";
import { toastSuccess, toastError } from "../ui/toast.js";
import { escapeHtml } from "../utils/format.js";
import { formatDate } from "../utils/date.js";
import { $, el } from "../utils/dom.js";
import { i18n } from "../config.js";

guardRoute();
loadTheme();
injectNav("archive.html");

let activeTab = "archive"; // "archive" | "trash"

const archiveList  = document.getElementById("archive-list");
const trashList    = document.getElementById("trash-list");
const archiveTab   = document.getElementById("tab-archive");
const trashTab     = document.getElementById("tab-trash");
const emptyArchive = document.getElementById("empty-archive");
const emptyTrash   = document.getElementById("empty-trash");

// ── Boot
(async () => {
  try {
    const data = await loadData();
    initState(data);
    renderBoth();
  } catch (err) {
    toastError(err.message || i18n.errorUnknown);
  }
})();

subscribe("tasks", renderBoth);

// ── Tab switch
archiveTab?.addEventListener("click", () => switchTab("archive"));
trashTab?.addEventListener("click",   () => switchTab("trash"));

function switchTab(tab) {
  activeTab = tab;
  archiveTab?.classList.toggle("active", tab === "archive");
  trashTab?.classList.toggle("active",   tab === "trash");
  document.getElementById("archive-panel")?.classList.toggle("hidden", tab !== "archive");
  document.getElementById("trash-panel")?.classList.toggle("hidden",   tab !== "trash");
}

function renderBoth() {
  renderArchive();
  renderTrash();
}

function renderArchive() {
  if (!archiveList) return;
  const items = (getState("tasks") || []).filter((t) => t.archivedAt && !t.deletedAt);
  archiveList.innerHTML = "";
  if (!items.length) { emptyArchive?.classList.remove("hidden"); return; }
  emptyArchive?.classList.add("hidden");
  for (const t of items) archiveList.appendChild(buildRow(t, "archive"));
}

function renderTrash() {
  if (!trashList) return;
  const items = (getState("tasks") || []).filter((t) => t.deletedAt);
  trashList.innerHTML = "";
  if (!items.length) { emptyTrash?.classList.remove("hidden"); return; }
  emptyTrash?.classList.add("hidden");
  for (const t of items) trashList.appendChild(buildRow(t, "trash"));
}

function buildRow(task, type) {
  const row = el("div", { class: "archive-item glass-sm" });
  row.innerHTML = `
    <div class="archive-item-title">${escapeHtml(task.title)}</div>
    <div class="archive-item-meta">${type === "archive" ? "📦 Arxivləndi" : "🗑️ Silindi"}: ${formatDate(type === "archive" ? task.archivedAt : task.deletedAt)}</div>
  `;
  const actions = el("div", { class: "archive-item-actions flex gap-2" });

  if (type === "archive") {
    const restoreBtn = el("button", { class: "btn btn-sm btn-secondary" });
    restoreBtn.textContent = "Bərpa et";
    restoreBtn.addEventListener("click", () => restoreFromArchive(task.id));
    actions.appendChild(restoreBtn);
  } else {
    const restoreBtn = el("button", { class: "btn btn-sm btn-secondary" });
    restoreBtn.textContent = "Bərpa et";
    restoreBtn.addEventListener("click", () => restoreFromTrash(task.id));

    const deleteBtn = el("button", { class: "btn btn-sm btn-danger" });
    deleteBtn.textContent = "Sil (həmişəlik)";
    deleteBtn.addEventListener("click", () => permanentDelete(task.id));

    actions.append(restoreBtn, deleteBtn);
  }

  row.appendChild(actions);
  return row;
}

function restoreFromArchive(id) {
  const tasks = (getState("tasks") || []).map((t) =>
    t.id === id ? { ...t, archivedAt: null } : t
  );
  setState("tasks", tasks);
  debouncedSave(getState());
  toastSuccess(i18n.taskRestored);
}

function restoreFromTrash(id) {
  const tasks = (getState("tasks") || []).map((t) =>
    t.id === id ? { ...t, deletedAt: null } : t
  );
  setState("tasks", tasks);
  debouncedSave(getState());
  toastSuccess(i18n.taskRestored);
}

async function permanentDelete(id) {
  const ok = await confirm("Bu task həmişəlik silinsin?", i18n.delete, "danger");
  if (!ok) return;
  setState("tasks", (getState("tasks") || []).filter((t) => t.id !== id));
  debouncedSave(getState());
  toastSuccess(i18n.taskDeleted);
}

// Empty trash button
document.getElementById("empty-trash-btn")?.addEventListener("click", async () => {
  const ok = await confirm("Bütün zibil qutusu həmişəlik silinsin?", "Hamısını sil", "danger");
  if (!ok) return;
  setState("tasks", (getState("tasks") || []).filter((t) => !t.deletedAt));
  debouncedSave(getState());
  toastSuccess("Zibil qutusu təmizləndi");
});
