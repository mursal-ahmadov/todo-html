/**
 * Debounce utility.
 * @module utils/debounce
 */

/**
 * Returns a debounced version of `fn` that only fires after
 * `wait` ms of inactivity.
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @param {number} wait  milliseconds
 * @returns {(...args: Parameters<T>) => void}
 */
export function debounce(fn, wait) {
  let timer;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * Returns a throttled version of `fn` that fires at most once per `wait` ms.
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @param {number} wait
 * @returns {(...args: Parameters<T>) => void}
 */
export function throttle(fn, wait) {
  let last = 0;
  return function throttled(...args) {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      return fn.apply(this, args);
    }
  };
}
