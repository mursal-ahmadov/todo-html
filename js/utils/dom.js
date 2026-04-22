/**
 * DOM query helpers.
 * @module utils/dom
 */

/**
 * Shorthand for document.querySelector.
 * @param {string} sel
 * @param {Element|Document} [root=document]
 * @returns {Element|null}
 */
export const $ = (sel, root = document) => root.querySelector(sel);

/**
 * Shorthand for document.querySelectorAll (returns array).
 * @param {string} sel
 * @param {Element|Document} [root=document]
 * @returns {Element[]}
 */
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/**
 * Create an element with optional attributes and children.
 * @param {string} tag
 * @param {Record<string,string>} [attrs={}]
 * @param {...(string|Node)} children
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === "class") {
      node.className = v;
    } else {
      node.setAttribute(k, v);
    }
  }
  for (const child of children) {
    if (child == null) continue;
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

/**
 * Set element text content safely.
 * @param {Element} element
 * @param {string} text
 */
export function setText(element, text) {
  element.textContent = String(text ?? "");
}

/**
 * Toggle a class on an element.
 * @param {Element} element
 * @param {string} cls
 * @param {boolean} [force]
 */
export function toggleClass(element, cls, force) {
  element.classList.toggle(cls, force);
}

/**
 * Remove all children of an element.
 * @param {Element} element
 */
export function clearChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Delegate event listener on a parent for matching children.
 * @param {Element} parent
 * @param {string} eventType
 * @param {string} selector
 * @param {function(Event, Element): void} handler
 */
export function delegate(parent, eventType, selector, handler) {
  parent.addEventListener(eventType, (e) => {
    const target = /** @type {Element} */ (e.target)?.closest(selector);
    if (target && parent.contains(target)) {
      handler(e, target);
    }
  });
}

/**
 * Return a promise that resolves after the next animation frame.
 * @returns {Promise<void>}
 */
export function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

/**
 * Trap focus within a container (for modals).
 * @param {Element} container
 * @returns {function(): void}  cleanup function
 */
export function trapFocus(container) {
  const focusable = /** @type {NodeListOf<HTMLElement>} */ (
    container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  );
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];

  function onKeydown(e) {
    if (e.key !== "Tab") return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }

  container.addEventListener("keydown", onKeydown);
  first?.focus();
  return () => container.removeEventListener("keydown", onKeydown);
}
