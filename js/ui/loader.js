/**
 * Loading spinner / skeleton screen helpers.
 * @module ui/loader
 */

import { el } from "../utils/dom.js";
import { i18n } from "../config.js";

/**
 * Show a full-page loading overlay.
 * @param {string} [message]
 * @returns {{ hide: function(): void }}
 */
export function showLoader(message = i18n.loading) {
  const overlay = el("div", {
    id: "page-loader",
    role: "status",
    "aria-live": "polite",
    style: `
      position:fixed;inset:0;
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      gap:var(--s-4);z-index:9999;
      background:rgba(0,0,0,0.35);
      backdrop-filter:blur(8px);
    `,
  });

  const spinner = el("div", { class: "spinner spinner-lg" });
  const label   = el("p",   { style: "font-size:var(--fs-sm);color:#fff;opacity:.8;" });
  label.textContent = message;

  overlay.append(spinner, label);
  document.body.appendChild(overlay);

  return {
    hide() {
      overlay.remove();
    },
  };
}

/**
 * Create a skeleton block element.
 * @param {string} [style]  inline style overrides
 * @returns {HTMLElement}
 */
export function skeleton(style = "") {
  const s = el("div", { class: "skeleton", style });
  return s;
}

/**
 * Replace container content with N skeleton rows, then return a restore function.
 * @param {HTMLElement} container
 * @param {number} [count=3]
 * @returns {function(): void}
 */
export function showSkeletons(container, count = 3) {
  const original = container.innerHTML;
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const row = el("div", {
      class: "glass-card",
      style: "display:flex;align-items:center;gap:var(--s-3);padding:var(--s-3) var(--s-4);",
    });
    row.append(
      skeleton("width:22px;height:22px;border-radius:50%;flex-shrink:0;"),
      el("div", { style: "flex:1;display:flex;flex-direction:column;gap:6px;" },
        skeleton("height:14px;width:60%;"),
        skeleton("height:11px;width:35%;"),
      )
    );
    container.appendChild(row);
  }
  return () => { container.innerHTML = original; };
}
