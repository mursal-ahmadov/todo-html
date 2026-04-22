/**
 * Confirmation dialog.
 * @module ui/confirm
 */

import { openModal } from "./modal.js";
import { i18n } from "../config.js";

/**
 * Show a confirmation dialog and return a promise that resolves to boolean.
 * @param {string} message
 * @param {string} [confirmLabel]
 * @param {"primary"|"danger"} [confirmType="danger"]
 * @returns {Promise<boolean>}
 */
export function confirm(message, confirmLabel, confirmType = "danger") {
  return new Promise((resolve) => {
    const body = document.createElement("p");
    body.textContent = message;
    body.style.cssText = "font-size:var(--fs-sm);color:var(--text-secondary);line-height:var(--lh-relaxed)";

    openModal({
      title: i18n.confirm,
      body,
      actions: [
        {
          label: i18n.cancel,
          type: "secondary",
          onClick: (close) => { close(); resolve(false); },
        },
        {
          label: confirmLabel || i18n.confirm,
          type: confirmType,
          onClick: (close) => { close(); resolve(true); },
        },
      ],
    });
  });
}
