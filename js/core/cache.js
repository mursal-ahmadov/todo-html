/**
 * IndexedDB cache for offline support.
 * Stores the latest data snapshot so the app renders instantly on load.
 * @module core/cache
 */

import { IDB_NAME, IDB_VERSION } from "../config.js";

/** @type {IDBDatabase|null} */
let _db = null;

/**
 * Open (or create) the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
async function openDB() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache", { keyPath: "id" });
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Save a value to the cache store.
 * @param {{data: object, sha: string}} snapshot
 * @returns {Promise<void>}
 */
export async function saveToCache(snapshot) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction("cache", "readwrite");
      const store = tx.objectStore("cache");
      store.put({ id: "main", ...snapshot });
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  } catch {
    // Non-critical — silently ignore if IDB is unavailable
  }
}

/**
 * Load the main data snapshot from cache.
 * @returns {Promise<{data: object, sha: string}|null>}
 */
export async function loadFromCache() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction("cache", "readonly");
      const store = tx.objectStore("cache");
      const req   = store.get("main");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror   = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Clear all cached data.
 * @returns {Promise<void>}
 */
export async function clearCache() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction("cache", "readwrite");
      const store = tx.objectStore("cache");
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  } catch {
    // Silently ignore
  }
}
