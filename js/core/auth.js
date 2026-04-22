/**
 * Authentication module — token + passphrase management.
 * Token is stored AES-GCM encrypted in localStorage.
 * Passphrase is kept only in a module-level variable (memory only).
 * @module core/auth
 */

import { STORAGE_KEYS } from "../config.js";
import {
  sha256,
  encryptWithPassphrase,
  decryptWithPassphrase,
} from "./crypto.js";

/** In-memory passphrase (never persisted). */
let _passphrase = "";

/** In-memory decrypted token. */
let _token = "";

/**
 * Perform first-time setup: encrypt token, store everything in localStorage.
 * @param {string} token       GitHub PAT
 * @param {string} passphrase  User-chosen passphrase
 * @param {string} repo        "owner/reponame" of private data repo
 * @returns {Promise<void>}
 */
export async function setupAuth(token, passphrase, repo) {
  const encrypted = await encryptWithPassphrase(token, passphrase);
  const hash = await sha256(passphrase);

  localStorage.setItem(STORAGE_KEYS.TOKEN_ENC,       JSON.stringify(encrypted));
  localStorage.setItem(STORAGE_KEYS.PASSPHRASE_HASH, hash);
  localStorage.setItem(STORAGE_KEYS.REPO,            repo);

  _passphrase = passphrase;
  _token      = token;
}

/**
 * Unlock on subsequent visits: verify passphrase hash and decrypt token.
 * @param {string} passphrase
 * @returns {Promise<boolean>}  true if passphrase is correct
 */
export async function unlockAuth(passphrase) {
  const storedHash = localStorage.getItem(STORAGE_KEYS.PASSPHRASE_HASH);
  if (!storedHash) return false;

  const inputHash = await sha256(passphrase);
  if (inputHash !== storedHash) return false;

  const packed = JSON.parse(localStorage.getItem(STORAGE_KEYS.TOKEN_ENC) || "null");
  if (!packed) return false;

  _token      = await decryptWithPassphrase(packed, passphrase);
  _passphrase = passphrase;
  return true;
}

/**
 * Returns true if auth credentials are present in localStorage.
 * @returns {boolean}
 */
export function hasStoredAuth() {
  return !!(
    localStorage.getItem(STORAGE_KEYS.TOKEN_ENC) &&
    localStorage.getItem(STORAGE_KEYS.PASSPHRASE_HASH) &&
    localStorage.getItem(STORAGE_KEYS.REPO)
  );
}

/**
 * Returns true if the session is currently authenticated (token in memory).
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!_token;
}

/**
 * Return the decrypted GitHub token.
 * @returns {string}
 */
export function getToken() {
  return _token;
}

/**
 * Return the current in-memory passphrase.
 * @returns {string}
 */
export function getPassphrase() {
  return _passphrase;
}

/**
 * Return the stored "owner/repo" string for the private data repo.
 * @returns {string}
 */
export function getDataRepo() {
  return localStorage.getItem(STORAGE_KEYS.REPO) || "";
}

/**
 * Clear all stored auth data and in-memory secrets.
 * Call on logout.
 */
export function logout() {
  _passphrase = "";
  _token      = "";
  localStorage.clear();
}

/**
 * Update the passphrase (re-encrypt the stored token).
 * @param {string} oldPassphrase
 * @param {string} newPassphrase
 * @returns {Promise<boolean>}
 */
export async function changePassphrase(oldPassphrase, newPassphrase) {
  const ok = await unlockAuth(oldPassphrase);
  if (!ok) return false;
  const repo = getDataRepo();
  await setupAuth(_token, newPassphrase, repo);
  return true;
}

/**
 * Update the stored GitHub token (re-encrypted with current passphrase).
 * @param {string} newToken
 * @returns {Promise<void>}
 */
export async function changeToken(newToken) {
  const repo = getDataRepo();
  await setupAuth(newToken, _passphrase, repo);
}
