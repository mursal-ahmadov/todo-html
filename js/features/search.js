/**
 * Search and filter feature.
 * @module features/search
 */

import { tasks } from "../core/state.js";
import { renderTaskList } from "./tasks.js";
import { debounce } from "../utils/debounce.js";
import { $ } from "../utils/dom.js";

/**
 * Fuzzy-ish task search: matches title, notes, tags.
 * @param {string} query
 * @returns {object[]}
 */
export function searchTasks(query) {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return tasks().filter((t) => {
    if (t.deletedAt || t.archivedAt) return false;
    return (
      (t.title || "").toLowerCase().includes(q) ||
      (t.notes || "").toLowerCase().includes(q) ||
      (t.tags || []).some((tag) => tag.toLowerCase().includes(q))
    );
  });
}

/**
 * Set up the search input to live-filter a task list container.
 * @param {HTMLInputElement} input
 * @param {HTMLElement} container
 * @param {function(object[]): void} [onResults]  callback with results array
 */
export function bindSearchInput(input, container, onResults) {
  const doSearch = debounce((value) => {
    if (!value.trim()) {
      if (onResults) onResults(null); // null = clear search, show default
      return;
    }
    const results = searchTasks(value);
    if (onResults) {
      onResults(results);
    } else {
      renderTaskList(container, results);
    }
  }, 200);

  input.addEventListener("input", (e) => doSearch(e.target.value));

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      input.value = "";
      doSearch("");
    }
  });
}

/**
 * Open / toggle the command-palette style search overlay.
 * @param {function(object):void} onSelect  called when user picks a task
 */
export function openSearchOverlay(onSelect) {
  // Remove existing
  document.getElementById("search-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "search-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Axtarış");
  overlay.style.cssText = `
    position:fixed;inset:0;
    display:flex;align-items:flex-start;justify-content:center;
    padding-top:15vh;
    background:rgba(0,0,0,0.5);
    backdrop-filter:blur(4px);
    z-index:var(--z-modal);
    animation:fadeIn 150ms ease both;
  `;

  const panel = document.createElement("div");
  panel.className = "glass";
  panel.style.cssText = "width:100%;max-width:560px;overflow:hidden;border-radius:var(--r-xl);";

  const inputWrap = document.createElement("div");
  inputWrap.style.cssText = "display:flex;align-items:center;gap:var(--s-3);padding:var(--s-4) var(--s-5);border-bottom:1px solid var(--divider);";
  inputWrap.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Task axtarın…";
  input.style.cssText = "flex:1;background:none;border:none;font-size:var(--fs-lg);color:var(--text-primary);outline:none;";
  input.setAttribute("autocomplete", "off");
  inputWrap.appendChild(input);

  const resultsList = document.createElement("div");
  resultsList.style.cssText = "max-height:360px;overflow-y:auto;";

  panel.append(inputWrap, resultsList);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  input.focus();

  const doSearch = debounce((q) => {
    resultsList.innerHTML = "";
    if (!q.trim()) return;
    const results = searchTasks(q).slice(0, 20);
    if (!results.length) {
      resultsList.innerHTML = `<p style="padding:var(--s-5);text-align:center;color:var(--text-muted);font-size:var(--fs-sm)">Nəticə tapılmadı</p>`;
      return;
    }
    for (const task of results) {
      const item = document.createElement("div");
      item.className = "dropdown-item";
      item.style.cssText = "padding:var(--s-3) var(--s-5);cursor:pointer;";
      item.setAttribute("role", "option");
      item.setAttribute("tabindex", "0");

      const t = document.createElement("div");
      t.style.cssText = "font-size:var(--fs-sm);font-weight:500;color:var(--text-primary);";
      t.textContent = task.title;

      item.appendChild(t);
      item.addEventListener("click", () => {
        overlay.remove();
        onSelect?.(task);
      });
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { overlay.remove(); onSelect?.(task); }
      });
      resultsList.appendChild(item);
    }
  }, 150);

  input.addEventListener("input", (e) => doSearch(e.target.value));

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.addEventListener("keydown", function onKey(e) {
    if (e.key === "Escape") { overlay.remove(); document.removeEventListener("keydown", onKey); }
  });
}
