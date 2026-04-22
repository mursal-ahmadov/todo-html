/**
 * Task detail modal — view and edit a task.
 * Separated to avoid circular imports with tasks.js.
 * @module features/taskModal
 */

import { el, $ } from "../utils/dom.js";
import { openModal, closeModal } from "../ui/modal.js";
import { updateTask, addTask, createTask } from "./tasks.js";
import { categories, tags, getState } from "../core/state.js";
import { toInputDatetime } from "../utils/date.js";
import { i18n } from "../config.js";
import { generateId } from "../utils/id.js";
import { escapeHtml } from "../utils/format.js";

/**
 * Open the task detail / create modal.
 * @param {object|null} [task=null]  null = create new
 */
export function openTaskModal(task = null) {
  const isNew = !task;
  if (isNew) task = createTask();

  const form = buildTaskForm(task);

  openModal({
    title: isNew ? "Yeni Task" : "Taskı Redaktə et",
    body: form,
    size: "lg",
    actions: [
      {
        label: i18n.cancel,
        type: "secondary",
        onClick: (close) => close(),
      },
      {
        label: i18n.save,
        type: "primary",
        onClick: (close) => {
          const data = readForm(form, task);
          if (!data.title.trim()) {
            form.querySelector("#task-title")?.classList.add("animate-shake");
            return;
          }
          if (isNew) {
            addTask(data);
          } else {
            updateTask(task.id, data);
          }
          close();
        },
      },
    ],
  });
}

/**
 * Build the task form element.
 * @param {object} task
 * @returns {HTMLElement}
 */
function buildTaskForm(task) {
  const wrap = el("div", { class: "flex-col gap-4" });

  // Title
  const titleInput = el("input", {
    id: "task-title",
    class: "input",
    type: "text",
    placeholder: "Task başlığı…",
    value: task.title || "",
    required: "true",
    maxlength: "500",
  });
  wrap.appendChild(labelWrap("Başlıq", titleInput));

  // Notes (textarea)
  const notesArea = el("textarea", {
    id: "task-notes",
    class: "input",
    placeholder: "Qeydlər (Markdown dəstəklənir)…",
    rows: "3",
  });
  notesArea.textContent = task.notes || "";
  wrap.appendChild(labelWrap("Qeydlər", notesArea));

  // Due date + reminder row
  const row = el("div", { class: "grid-2 gap-3" });

  const dueInput = el("input", {
    id: "task-due",
    class: "input",
    type: "datetime-local",
    value: task.dueDate ? toInputDatetime(task.dueDate) : "",
  });

  const reminderInput = el("input", {
    id: "task-reminder",
    class: "input",
    type: "datetime-local",
    value: task.reminderAt ? toInputDatetime(task.reminderAt) : "",
  });

  row.append(labelWrap("Son tarix", dueInput), labelWrap("Xatırlatma", reminderInput));
  wrap.appendChild(row);

  // Quick date buttons
  const quickBtns = el("div", { class: "flex gap-2", style: "flex-wrap:wrap;" });
  for (const [label, fn] of [
    ["Bu gün", () => setLocalDatetime(dueInput, 0)],
    ["Sabah",  () => setLocalDatetime(dueInput, 1)],
    ["Həftəyə",() => setLocalDatetime(dueInput, 7)],
  ]) {
    const btn = el("button", { type: "button", class: "btn btn-sm btn-secondary" });
    btn.textContent = label;
    btn.addEventListener("click", fn);
    quickBtns.appendChild(btn);
  }
  wrap.appendChild(quickBtns);

  // Category
  const catSelect = el("select", { id: "task-category", class: "input" });
  const noneOpt = el("option", { value: "" });
  noneOpt.textContent = "— Kateqoriyasız —";
  catSelect.appendChild(noneOpt);
  for (const cat of categories()) {
    const opt = el("option", { value: cat.id });
    opt.textContent = `${cat.icon || ""} ${cat.name}`;
    if (cat.id === task.categoryId) opt.selected = true;
    catSelect.appendChild(opt);
  }
  wrap.appendChild(labelWrap("Kateqoriya", catSelect));

  // Tags
  const tagWrap = el("div", { id: "task-tags-wrap", class: "flex-col gap-2" });
  const tagInputRow = el("div", { class: "flex gap-2" });
  const tagInput = el("input", {
    id: "task-tag-input",
    class: "input",
    type: "text",
    placeholder: "Teq əlavə et…",
    list: "tag-suggestions",
    autocomplete: "off",
  });

  // Suggestions datalist
  const datalist = el("datalist", { id: "tag-suggestions" });
  for (const t of tags()) {
    const opt = el("option", { value: t });
    datalist.appendChild(opt);
  }

  const tagAddBtn = el("button", { type: "button", class: "btn btn-sm btn-secondary" });
  tagAddBtn.textContent = "+ Əlavə et";

  tagInputRow.append(tagInput, datalist, tagAddBtn);
  tagWrap.appendChild(tagInputRow);

  // Existing tags chips
  const tagChipsWrap = el("div", { class: "flex gap-2", style: "flex-wrap:wrap;", id: "tag-chips" });
  const currentTags = [...(task.tags || [])];

  const renderChips = () => {
    tagChipsWrap.innerHTML = "";
    for (const t of currentTags) {
      const chip = el("span", { class: "chip active" });
      chip.textContent = `#${t}`;
      const rm = el("span", { class: "chip__remove", "aria-label": `${t} teqini sil` });
      rm.textContent = "×";
      rm.addEventListener("click", () => {
        currentTags.splice(currentTags.indexOf(t), 1);
        renderChips();
      });
      chip.appendChild(rm);
      tagChipsWrap.appendChild(chip);
    }
  };
  renderChips();

  const doAddTag = () => {
    const val = tagInput.value.trim().replace(/^#/, "");
    if (val && !currentTags.includes(val)) {
      currentTags.push(val);
      renderChips();
    }
    tagInput.value = "";
  };

  tagAddBtn.addEventListener("click", doAddTag);
  tagInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); doAddTag(); }
  });

  tagWrap.append(tagChipsWrap);
  wrap.appendChild(labelWrap("Teqlər", tagWrap));

  // Recurring
  const recurringSelect = el("select", { id: "task-recurring", class: "input" });
  for (const [val, label] of [
    ["none",    "Təkrarlanmır"],
    ["daily",   "Hər gün"],
    ["weekly",  "Həftəlik"],
    ["monthly", "Aylıq"],
  ]) {
    const opt = el("option", { value: val });
    opt.textContent = label;
    if (val === (task.recurring?.type || "none")) opt.selected = true;
    recurringSelect.appendChild(opt);
  }
  wrap.appendChild(labelWrap("Təkrar", recurringSelect));

  // Store ref for readForm
  wrap._tagList = currentTags;

  return wrap;
}

/** @param {string} labelText @param {HTMLElement} input */
function labelWrap(labelText, input) {
  const wrap = el("div", { class: "flex-col gap-2" });
  const lbl  = el("label", { class: "input-label" });
  lbl.textContent = labelText;
  if (input.id) lbl.setAttribute("for", input.id);
  wrap.append(lbl, input);
  return wrap;
}

/**
 * Set a datetime-local input to today + offsetDays.
 * @param {HTMLInputElement} input
 * @param {number} offsetDays
 */
function setLocalDatetime(input, offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(23, 59, 0, 0);
  // datetime-local format: YYYY-MM-DDTHH:mm
  const pad = (n) => String(n).padStart(2, "0");
  input.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Read form values into a task-shaped object.
 * @param {HTMLElement} form
 * @param {object} original
 * @returns {object}
 */
function readForm(form, original) {
  const title     = form.querySelector("#task-title")?.value?.trim() || "";
  const notes     = form.querySelector("#task-notes")?.value || "";
  const dueRaw    = form.querySelector("#task-due")?.value;
  const remRaw    = form.querySelector("#task-reminder")?.value;
  const catId     = form.querySelector("#task-category")?.value || null;
  const recurType = form.querySelector("#task-recurring")?.value || "none";
  const tagList   = form._tagList || [];

  return {
    ...original,
    title,
    notes,
    dueDate:    dueRaw   ? new Date(dueRaw).toISOString()  : null,
    reminderAt: remRaw   ? new Date(remRaw).toISOString()  : null,
    categoryId: catId || null,
    tags:       tagList,
    recurring:  { ...(original.recurring || {}), type: recurType },
  };
}
