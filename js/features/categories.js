/**
 * Category CRUD.
 * @module features/categories
 */

import { getState, setState, categories } from "../core/state.js";
import { debouncedSave } from "../core/storage.js";
import { generateId } from "../utils/id.js";
import { openModal } from "../ui/modal.js";
import { confirm } from "../ui/confirm.js";
import { toastSuccess } from "../ui/toast.js";
import { el } from "../utils/dom.js";
import { i18n } from "../config.js";

const PALETTE = [
  "#6366f1","#ec4899","#10b981","#f59e0b",
  "#3b82f6","#ef4444","#8b5cf6","#14b8a6",
  "#f97316","#06b6d4","#84cc16","#a855f7",
];

/**
 * Open category create/edit modal.
 * @param {object|null} [cat=null]
 * @param {function():void} [onDone]
 */
export function openCategoryModal(cat = null, onDone) {
  const isNew = !cat;
  if (isNew) cat = { id: generateId(), name: "", color: PALETTE[0], icon: "📋", order: categories().length };

  const form = el("div", { class: "flex-col gap-4" });

  const nameInput = el("input", { id: "cat-name", class: "input", type: "text", placeholder: "Kateqoriya adı…", value: cat.name });
  appendLabel(form, "Ad", nameInput);

  // Color palette
  const colorWrap = el("div", { class: "flex-col gap-2" });
  const colorLabel = el("label", { class: "input-label" });
  colorLabel.textContent = i18n.categoryColor;
  const colorGrid = el("div", { class: "flex gap-2", style: "flex-wrap:wrap;" });
  let selectedColor = cat.color;

  for (const color of PALETTE) {
    const swatch = el("button", {
      type: "button",
      "aria-label": color,
      style: `width:28px;height:28px;border-radius:50%;background:${color};border:3px solid ${color === selectedColor ? "#fff" : "transparent"};cursor:pointer;transition:border-color var(--t-fast)`,
    });
    swatch.addEventListener("click", () => {
      selectedColor = color;
      colorGrid.querySelectorAll("button").forEach((b) => b.style.borderColor = "transparent");
      swatch.style.borderColor = "#fff";
    });
    colorGrid.appendChild(swatch);
  }
  colorWrap.append(colorLabel, colorGrid);
  form.appendChild(colorWrap);

  // Icon (emoji)
  const EMOJIS = ["📋","💼","🏠","🎯","💡","📚","🏋️","🛒","🎨","🎮","🌿","⭐"];
  const iconWrap = el("div", { class: "flex-col gap-2" });
  const iconLabel = el("label", { class: "input-label" });
  iconLabel.textContent = i18n.categoryIcon;
  const iconGrid = el("div", { class: "flex gap-2", style: "flex-wrap:wrap;" });
  let selectedIcon = cat.icon;

  for (const emoji of EMOJIS) {
    const btn = el("button", {
      type: "button",
      "aria-label": emoji,
      style: `font-size:22px;padding:4px 6px;border-radius:var(--r-sm);border:2px solid ${emoji === selectedIcon ? "var(--accent)" : "transparent"};cursor:pointer;background:var(--surface);transition:border-color var(--t-fast)`,
    });
    btn.textContent = emoji;
    btn.addEventListener("click", () => {
      selectedIcon = emoji;
      iconGrid.querySelectorAll("button").forEach((b) => b.style.borderColor = "transparent");
      btn.style.borderColor = "var(--accent)";
    });
    iconGrid.appendChild(btn);
  }
  iconWrap.append(iconLabel, iconGrid);
  form.appendChild(iconWrap);

  openModal({
    title: isNew ? i18n.newCategory : i18n.edit + " kateqoriya",
    body: form,
    actions: [
      { label: i18n.cancel, type: "secondary", onClick: (c) => c() },
      {
        label: i18n.save,
        type: "primary",
        onClick: (close) => {
          const name = nameInput.value.trim();
          if (!name) { nameInput.classList.add("animate-shake"); return; }
          const updated = { ...cat, name, color: selectedColor, icon: selectedIcon };
          if (isNew) {
            setState("categories", [...categories(), updated]);
          } else {
            setState("categories", categories().map((c) => c.id === cat.id ? updated : c));
          }
          debouncedSave(getState());
          toastSuccess(isNew ? i18n.categoryAdded : i18n.taskUpdated);
          close();
          onDone?.();
        },
      },
    ],
  });
}

function appendLabel(wrap, text, input) {
  const w = el("div", { class: "flex-col gap-2" });
  const l = el("label", { class: "input-label" });
  l.textContent = text;
  if (input.id) l.setAttribute("for", input.id);
  w.append(l, input);
  wrap.appendChild(w);
}

/**
 * Delete a category, moving its tasks to null.
 * @param {string} id
 */
export async function deleteCategory(id) {
  const ok = await confirm(`Bu kateqoriya silinsin? İçindəki tasklar "Kateqoriyasız"-a köçəcək.`, i18n.delete);
  if (!ok) return;

  // Move tasks
  const updatedTasks = (getState("tasks") || []).map((t) =>
    t.categoryId === id ? { ...t, categoryId: null } : t
  );
  setState("tasks", updatedTasks);
  setState("categories", categories().filter((c) => c.id !== id));
  debouncedSave(getState());
  toastSuccess(i18n.categoryDeleted);
}
