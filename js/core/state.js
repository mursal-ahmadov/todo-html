/**
 * Application state — observable in-memory store.
 * Implements a minimal observer pattern.
 * @module core/state
 */

/** @type {object} */
let _state = {};

/** @type {Map<string, Set<function>>} */
const _listeners = new Map();

/**
 * Initialize state from data object.
 * @param {object} data
 */
export function initState(data) {
  _state = structuredClone(data);
}

/**
 * Get the full state or a top-level key.
 * @param {string} [key]
 * @returns {any}
 */
export function getState(key) {
  if (key !== undefined) return _state[key];
  return _state;
}

/**
 * Update one top-level state key and notify listeners.
 * @param {string} key
 * @param {any} value
 */
export function setState(key, value) {
  _state[key] = value;
  _notify(key);
  _notify("*");
}

/**
 * Patch multiple keys at once.
 * @param {Partial<object>} partial
 */
export function patchState(partial) {
  Object.assign(_state, partial);
  for (const key of Object.keys(partial)) {
    _notify(key);
  }
  _notify("*");
}

/**
 * Subscribe to changes on a key ("*" = any change).
 * @param {string} key
 * @param {function(any): void} listener
 * @returns {function(): void}  unsubscribe
 */
export function subscribe(key, listener) {
  if (!_listeners.has(key)) _listeners.set(key, new Set());
  _listeners.get(key).add(listener);
  return () => _listeners.get(key)?.delete(listener);
}

/**
 * @param {string} key
 */
function _notify(key) {
  const value = key === "*" ? _state : _state[key];
  _listeners.get(key)?.forEach((fn) => fn(value));
}

/**
 * Shorthand helpers for common state keys.
 */
export const tasks      = () => /** @type {Array}   */ (getState("tasks")      || []);
export const categories = () => /** @type {Array}   */ (getState("categories") || []);
export const tags       = () => /** @type {Array}   */ (getState("tags")       || []);
export const settings   = () => /** @type {object}  */ (getState("settings")   || {});
export const stats      = () => /** @type {object}  */ (getState("stats")      || {});
