/**
 * Empty state component.
 * @module ui/empty
 */

import { el } from "../utils/dom.js";

/**
 * Create an empty state element.
 * @param {object} opts
 * @param {string} opts.icon
 * @param {string} opts.title
 * @param {string} [opts.subtitle]
 * @param {HTMLElement} [opts.action]
 * @returns {HTMLElement}
 */
export function emptyState({ icon, title, subtitle, action }) {
  const wrap = el("div", { class: "empty-state" });

  const iconEl = el("div", { class: "empty-state__icon", "aria-hidden": "true" });
  iconEl.textContent = icon;

  const titleEl = el("div", { class: "empty-state__title" });
  titleEl.textContent = title;

  wrap.append(iconEl, titleEl);

  if (subtitle) {
    const sub = el("p", { class: "empty-state__subtitle" });
    sub.textContent = subtitle;
    wrap.appendChild(sub);
  }

  if (action) {
    wrap.appendChild(action);
  }

  return wrap;
}
