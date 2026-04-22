/**
 * Keyboard shortcuts.
 * @module features/shortcuts
 */

import { openTaskModal } from "./taskModal.js";
import { openSearchOverlay } from "./search.js";
import { applyTheme, currentTheme } from "./theme.js";
import { openModal } from "../ui/modal.js";
import { el } from "../utils/dom.js";
import { BASE_PATH } from "../config.js";

/** @type {boolean} */
let _registered = false;

const SHORTCUTS = [
  { keys: ["N"],       desc: "Yeni task əlavə et" },
  { keys: ["/", "Ctrl+K"], desc: "Axtarış / Komanda paleti" },
  { keys: ["1","2","3","4","5"], desc: "Sidebar bölmələri" },
  { keys: ["T"],       desc: "Tema dəyiş" },
  { keys: ["Esc"],     desc: "Modal bağla" },
  { keys: ["?"],       desc: "Bu yardım pəncərəsini göstər" },
];

/**
 * Register all keyboard shortcuts for the app page.
 */
export function registerShortcuts() {
  if (_registered) return;
  _registered = true;

  document.addEventListener("keydown", (e) => {
    // Skip when typing in inputs / textareas
    const tag = document.activeElement?.tagName;
    const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || document.activeElement?.isContentEditable;

    // Escape is always handled
    if (e.key === "Escape") return; // Handled by modal/overlay themselves

    if (inInput) return;

    switch (e.key) {
      case "n":
      case "N":
        if (!e.ctrlKey && !e.metaKey) openTaskModal();
        break;

      case "/":
        e.preventDefault();
        openSearchOverlay((task) => openTaskModal(task));
        break;

      case "k":
      case "K":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          openSearchOverlay((task) => openTaskModal(task));
        }
        break;

      case "t":
      case "T":
        if (!e.ctrlKey && !e.metaKey) {
          const next = currentTheme() === "dark" ? "light" : "dark";
          applyTheme(next, true);
        }
        break;

      case "?":
        showShortcutHelp();
        break;

      case "1": navigateTo(`${BASE_PATH}/app.html`);      break;
      case "2": navigateTo(`${BASE_PATH}/pomodoro.html`); break;
      case "3": navigateTo(`${BASE_PATH}/stats.html`);    break;
      case "4": navigateTo(`${BASE_PATH}/archive.html`);  break;
      case "5": navigateTo(`${BASE_PATH}/settings.html`); break;
    }
  });
}

function navigateTo(href) {
  if (window.location.pathname !== href.replace(/^.*\/todo-html/, "/todo-html")) {
    window.location.href = href;
  }
}

/**
 * Show a modal with all keyboard shortcuts.
 */
function showShortcutHelp() {
  const body = el("div", { class: "flex-col gap-3" });
  for (const s of SHORTCUTS) {
    const row = el("div", {
      style: "display:flex;align-items:center;justify-content:space-between;gap:var(--s-4);padding:var(--s-2) 0;border-bottom:1px solid var(--divider)",
    });
    const keysWrap = el("div", { class: "flex gap-2" });
    for (const k of s.keys) {
      const kbd = el("kbd", {
        style: "display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:24px;padding:0 6px;background:var(--surface);border:1px solid var(--glass-border);border-radius:var(--r-sm);font-size:var(--fs-xs);font-family:var(--font-mono);color:var(--text-primary);",
      });
      kbd.textContent = k;
      keysWrap.appendChild(kbd);
    }
    const desc = el("span", { style: "font-size:var(--fs-sm);color:var(--text-secondary);" });
    desc.textContent = s.desc;
    row.append(keysWrap, desc);
    body.appendChild(row);
  }
  openModal({ title: "Klaviatura Shortcut-ları", body, size: "sm" });
}
