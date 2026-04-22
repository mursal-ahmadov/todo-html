/**
 * GitHub API storage wrapper.
 * Loads and saves the encrypted data.json in the private repo.
 * @module core/storage
 */

import {
  GITHUB_API,
  DATA_FILE_PATH,
  STORAGE_KEYS,
  SAVE_DEBOUNCE_MS,
  RETRY_MAX,
  RETRY_BASE_MS,
  DATA_VERSION,
} from "../config.js";
import { getToken, getDataRepo, getPassphrase } from "./auth.js";
import { encryptWithPassphrase, decryptWithPassphrase } from "./crypto.js";
import { debounce } from "../utils/debounce.js";
import { saveToCache, loadFromCache } from "./cache.js";

/** Current SHA of data.json (needed for PUT). */
let _sha = "";

/** In-memory data object. */
let _data = null;

/**
 * Build default empty data structure.
 * @returns {object}
 */
export function defaultData() {
  return {
    version: DATA_VERSION,
    lastModified: new Date().toISOString(),
    tasks: [],
    categories: [
      { id: "cat-default", name: "Ümumi", color: "#6366f1", icon: "📋", order: 0 },
    ],
    tags: [],
    stats: {
      streak: 0,
      longestStreak: 0,
      lastCompletedDate: null,
      totalCompleted: 0,
      pomodoroSessions: [],
    },
    settings: {
      theme: "auto",
      language: "az",
      pomodoroWork: 25,
      pomodoroShortBreak: 5,
      pomodoroLongBreak: 15,
      pomodoroLongBreakEvery: 4,
      notificationsEnabled: true,
      soundEnabled: true,
      defaultView: "list",
      weekStart: 1,
    },
  };
}

/**
 * GitHub API GET with Authorization header.
 * @param {string} url
 * @returns {Promise<Response>}
 */
async function ghGet(url) {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
}

/**
 * GitHub API PUT with Authorization header.
 * @param {string} url
 * @param {object} body
 * @returns {Promise<Response>}
 */
async function ghPut(url, body) {
  return fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/**
 * Fetch with exponential-backoff retry on network errors.
 * @param {function(): Promise<Response>} requestFn
 * @returns {Promise<Response>}
 */
async function withRetry(requestFn) {
  let lastErr;
  for (let attempt = 0; attempt < RETRY_MAX; attempt++) {
    try {
      const res = await requestFn();
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < RETRY_MAX - 1) {
        await new Promise((r) => setTimeout(r, RETRY_BASE_MS * 2 ** attempt));
      }
    }
  }
  throw lastErr;
}

/**
 * Load data.json from the private repo. Decrypts and parses the result.
 * Falls back to IndexedDB cache when offline.
 * @returns {Promise<object>}
 */
export async function loadData() {
  const repo = getDataRepo();
  const url  = `${GITHUB_API}/repos/${repo}/contents/${DATA_FILE_PATH}`;

  // Try IndexedDB cache first for instant render
  const cached = await loadFromCache();
  if (cached) {
    _data = cached.data;
    _sha  = cached.sha || "";
  }

  try {
    const res = await withRetry(() => ghGet(url));

    if (res.status === 401) {
      throw Object.assign(new Error("UNAUTHORIZED"), { code: 401 });
    }
    if (res.status === 403) {
      throw Object.assign(new Error("RATE_LIMITED"), { code: 403 });
    }
    if (res.status === 404) {
      // First time — no file yet
      _data = defaultData();
      _sha  = "";
      await saveToCache({ data: _data, sha: "" });
      return _data;
    }

    const json = await res.json();
    _sha = json.sha;
    localStorage.setItem(STORAGE_KEYS.DATA_SHA, _sha);

    // Decrypt
    const raw       = atob(json.content.replace(/\n/g, ""));
    const packed    = JSON.parse(raw);
    const plaintext = await decryptWithPassphrase(packed, getPassphrase());
    _data = JSON.parse(plaintext);

    await saveToCache({ data: _data, sha: _sha });
    return _data;
  } catch (err) {
    if (err.code === 401 || err.code === 403) throw err;
    // Network error: use cache
    if (_data) return _data;
    _data = defaultData();
    return _data;
  }
}

/**
 * Encrypt and PUT data.json to the private repo.
 * @param {object} data
 * @returns {Promise<void>}
 */
export async function saveData(data) {
  data.lastModified = new Date().toISOString();
  _data = data;
  await saveToCache({ data, sha: _sha });

  const repo = getDataRepo();
  const url  = `${GITHUB_API}/repos/${repo}/contents/${DATA_FILE_PATH}`;

  const plaintext = JSON.stringify(data);
  const packed    = await encryptWithPassphrase(plaintext, getPassphrase());
  const content   = btoa(JSON.stringify(packed));

  const body = {
    message: "update data",
    content,
    ..._sha ? { sha: _sha } : {},
  };

  const res = await withRetry(() => ghPut(url, body));

  if (res.status === 409) {
    // SHA conflict — reload and retry once
    await loadData();
    return saveData(data);
  }
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw Object.assign(new Error(errBody.message || "Save failed"), { status: res.status });
  }

  const json = await res.json();
  _sha = json.content?.sha || _sha;
  localStorage.setItem(STORAGE_KEYS.DATA_SHA, _sha);
}

/**
 * Debounced version of saveData for use after local edits.
 * @type {function(object): void}
 */
export const debouncedSave = debounce((data) => {
  saveData(data).catch((err) => {
    console.error("Auto-save failed:", err);
  });
}, SAVE_DEBOUNCE_MS);

/**
 * Return current in-memory data (without re-fetching).
 * @returns {object|null}
 */
export function getData() {
  return _data;
}

/**
 * Create the private repo via GitHub API.
 * @param {string} repoName  Short name, e.g. "todo-data"
 * @returns {Promise<{owner: string, repo: string}>}
 */
export async function createDataRepo(repoName) {
  const res = await fetch(`${GITHUB_API}/user/repos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: repoName,
      private: true,
      auto_init: false,
      description: "Todo app private data storage",
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Repo yaradıla bilmədi.");
  }
  const json = await res.json();
  return { owner: json.owner.login, repo: json.name };
}

/**
 * Get authenticated user login from GitHub API.
 * @returns {Promise<string>}
 */
export async function getGitHubUser() {
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) throw new Error("Could not fetch user.");
  const json = await res.json();
  return json.login;
}
