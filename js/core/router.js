/**
 * Router / navigation guard.
 * Redirects unauthenticated users to index.html.
 * @module core/router
 */

import { isAuthenticated, hasStoredAuth } from "./auth.js";
import { BASE_PATH } from "../config.js";

const AUTH_PAGE  = `${BASE_PATH}/index.html`;
const APP_PAGE   = `${BASE_PATH}/app.html`;

/**
 * Run on every protected page load.
 * If there are no credentials in storage → go to login.
 * If there are stored credentials but session not unlocked → go to login.
 */
export function guardRoute() {
  if (!hasStoredAuth() || !isAuthenticated()) {
    window.location.replace(AUTH_PAGE);
  }
}

/**
 * Redirect to app page after successful login.
 */
export function redirectToApp() {
  const next = new URLSearchParams(window.location.search).get("next");
  window.location.replace(next || APP_PAGE);
}

/**
 * Redirect to login (preserving current page as `next` param).
 */
export function redirectToLogin() {
  const next = encodeURIComponent(window.location.href);
  window.location.replace(`${AUTH_PAGE}?next=${next}`);
}

/**
 * Navigate to a page within the app.
 * @param {string} path  e.g. "/todo-html/stats.html"
 */
export function navigate(path) {
  window.location.href = path;
}
