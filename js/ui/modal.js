/**
 * Modal dialog system.
 * @module ui/modal
 */

import { el, trapFocus } from "../utils/dom.js";

/** @type {HTMLElement|null} */
let _overlay = null;
let _cleanup = null;

/**
 * Open a modal with given content.
 * @param {object} opts
 * @param {string}           opts.title
 * @param {HTMLElement|string} opts.body
 * @param {Array<{label:string, type?:string, onClick:function}>} [opts.actions]
 * @param {string} [opts.size="md"]  "sm"|"md"|"lg"
 * @returns {{ close: function(): void }}
 */
export function openModal({ title, body, actions = [], size = "md" }) {
  closeModal();

  _overlay = el("div", { class: "modal-overlay", role: "dialog", "aria-modal": "true", "aria-label": title });

  const modal = el("div", { class: `modal glass ${size === "lg" ? "modal--lg" : ""}` });

  // Header
  const header = el("div", { class: "modal-header" });
  const titleEl = el("h2", { class: "modal-title" });
  titleEl.textContent = title;

  const closeBtn = el("button", {
    class: "btn-icon-round",
    "aria-label": "Bağla",
    type: "button",
  });
  closeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
  closeBtn.addEventListener("click", closeModal);
  header.append(titleEl, closeBtn);

  // Body
  const bodyEl = el("div", { class: "modal-body" });
  if (typeof body === "string") {
    bodyEl.innerHTML = body; // Caller must ensure safety
  } else {
    bodyEl.appendChild(body);
  }

  modal.append(header, bodyEl);

  // Footer actions
  if (actions.length) {
    const footer = el("div", { class: "modal-footer" });
    for (const action of actions) {
      const btn = el("button", {
        class: `btn btn-${action.type || "secondary"}`,
        type: "button",
      });
      btn.textContent = action.label;
      btn.addEventListener("click", () => action.onClick(closeModal));
      footer.appendChild(btn);
    }
    modal.appendChild(footer);
  }

  _overlay.appendChild(modal);
  document.body.appendChild(_overlay);

  // Close on overlay click
  _overlay.addEventListener("click", (e) => {
    if (e.target === _overlay) closeModal();
  });

  // Close on Escape
  const onKey = (e) => { if (e.key === "Escape") closeModal(); };
  document.addEventListener("keydown", onKey);

  _cleanup = trapFocus(modal);

  return { close: closeModal };
}

/**
 * Close the currently open modal.
 */
export function closeModal() {
  if (!_overlay) return;
  _cleanup?.();
  _overlay.classList.add("closing");
  _overlay.querySelector(".modal")?.classList.add("closing");
  _overlay.addEventListener("animationend", () => {
    _overlay?.remove();
    _overlay = null;
  }, { once: true });
}

/**
 * Check whether a modal is currently open.
 * @returns {boolean}
 */
export function isModalOpen() {
  return !!_overlay;
}
