/**
 * Toast notification system.
 * @module ui/toast
 */

import { el } from "../utils/dom.js";

/** @type {HTMLElement} */
let container;

function ensureContainer() {
  if (!container) {
    container = el("div", { id: "toast-container", role: "region", "aria-live": "polite", "aria-label": "Bildirişlər" });
    document.body.appendChild(container);
  }
}

/**
 * Show a toast message.
 * @param {string} message
 * @param {"success"|"error"|"warning"|"info"} [type="info"]
 * @param {number} [duration=3500]  ms, 0 = manual close only
 */
export function showToast(message, type = "info", duration = 3500) {
  ensureContainer();

  const icons = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };

  const toast = el("div", {
    class: `toast toast--${type} glass`,
    role: "alert",
    "aria-atomic": "true",
  });

  const icon  = el("span", { class: "toast__icon", "aria-hidden": "true" });
  icon.textContent = icons[type] || icons.info;

  const msg = el("span", { class: "toast__msg" });
  msg.textContent = message;

  const closeBtn = el("button", {
    class: "toast__close",
    "aria-label": "Bağla",
    type: "button",
  });
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => dismiss(toast));

  toast.append(icon, msg, closeBtn);
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => dismiss(toast), duration);
  }

  return toast;
}

/**
 * Dismiss a toast with exit animation.
 * @param {HTMLElement} toast
 */
function dismiss(toast) {
  if (!toast.isConnected) return;
  toast.classList.add("exiting");
  toast.addEventListener("animationend", () => toast.remove(), { once: true });
}

// Convenience shortcuts
export const toastSuccess = (msg, dur) => showToast(msg, "success", dur);
export const toastError   = (msg, dur) => showToast(msg, "error", dur);
export const toastWarning = (msg, dur) => showToast(msg, "warning", dur);
export const toastInfo    = (msg, dur) => showToast(msg, "info", dur);
