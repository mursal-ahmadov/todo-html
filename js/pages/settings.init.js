/**
 * settings.html initialisation.
 * @module pages/settings.init
 */

import { guardRoute } from "../core/router.js";
import { loadData } from "../core/storage.js";
import { initState, getState, setState } from "../core/state.js";
import { debouncedSave } from "../core/storage.js";
import { loadTheme, applyTheme } from "../features/theme.js";
import { injectNav } from "../ui/nav.js";
import { changePassphrase, changeToken, logout } from "../core/auth.js";
import { sendTestNotification, requestNotificationPermission } from "../features/notifications.js";
import { toastSuccess, toastError } from "../ui/toast.js";
import { confirm } from "../ui/confirm.js";
import { clearCache } from "../core/cache.js";
import { i18n, APP_VERSION } from "../config.js";

guardRoute();
loadTheme();
injectNav("settings.html");

// ── Boot
(async () => {
  try {
    const data = await loadData();
    initState(data);
    populateSettings();
  } catch (err) {
    toastError(err.message || i18n.errorUnknown);
  }
})();

function populateSettings() {
  const s = getState("settings") || {};

  bindToggle("setting-sound",        s.sound          ?? true,  "sound");
  bindToggle("setting-animations",   s.animations     ?? true,  "animations");
  bindToggle("setting-notifications",s.notifications  ?? false, "notifications");
  bindSelect("setting-theme",        s.theme          || "auto", "theme", (val) => applyTheme(val, true));
  bindNumber("setting-pomo-work",    s.pomodoroWork        || 25, "pomodoroWork");
  bindNumber("setting-pomo-short",   s.pomodoroShortBreak  || 5,  "pomodoroShortBreak");
  bindNumber("setting-pomo-long",    s.pomodoroLongBreak   || 15, "pomodoroLongBreak");
  bindNumber("setting-pomo-every",   s.pomodoroLongBreakEvery || 4, "pomodoroLongBreakEvery");

  const verEl = document.getElementById("app-version");
  if (verEl) verEl.textContent = APP_VERSION;
}

function bindToggle(id, current, key) {
  const el = document.getElementById(id);
  if (!el) return;
  el.checked = current;
  el.addEventListener("change", () => saveSetting(key, el.checked));
}

function bindSelect(id, current, key, cb) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = current;
  el.addEventListener("change", () => { saveSetting(key, el.value); cb?.(el.value); });
}

function bindNumber(id, current, key) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = current;
  el.addEventListener("change", () => saveSetting(key, Number(el.value)));
}

function saveSetting(key, value) {
  const settings = { ...(getState("settings") || {}), [key]: value };
  setState("settings", settings);
  debouncedSave(getState());
}

// ── Notification permission
document.getElementById("enable-notifications-btn")?.addEventListener("click", async () => {
  const perm = await requestNotificationPermission();
  if (perm === "granted") {
    saveSetting("notifications", true);
    toastSuccess("Bildirişlər aktiv edildi");
  } else {
    toastError("Bildiriş icazəsi rədd edildi");
  }
});

document.getElementById("test-notification-btn")?.addEventListener("click", () => {
  sendTestNotification();
});

// ── Change passphrase
document.getElementById("change-passphrase-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const curr = document.getElementById("current-passphrase")?.value;
  const next  = document.getElementById("new-passphrase")?.value;
  if (!curr || !next) return;
  try {
    await changePassphrase(curr, next);
    toastSuccess("Şifrə dəyişdirildi");
    e.target.reset();
  } catch (err) {
    toastError(err.message || i18n.errorUnknown);
  }
});

// ── Change token
document.getElementById("change-token-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const newToken = document.getElementById("new-token")?.value.trim();
  if (!newToken) return;
  try {
    await changeToken(newToken);
    toastSuccess("Token yeniləndi");
    e.target.reset();
  } catch (err) {
    toastError(err.message || i18n.errorUnknown);
  }
});

// ── Clear cache
document.getElementById("clear-cache-btn")?.addEventListener("click", async () => {
  await clearCache();
  toastSuccess("Cache təmizləndi");
});

// ── Export data
document.getElementById("export-btn")?.addEventListener("click", () => {
  const data = getState();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `todo-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// ── Logout
document.getElementById("logout-btn")?.addEventListener("click", async () => {
  const ok = await confirm("Çıxmaq istədiyinizə əminsiniz?", "Çıx", "danger");
  if (!ok) return;
  logout();
  window.location.href = "/todo-html/index.html";
});

// ── Delete all data
document.getElementById("delete-all-btn")?.addEventListener("click", async () => {
  const ok = await confirm("BÜTÜN datanız silinsin? Bu əməliyyat geri qaytarıla bilməz!", "Hamısını sil", "danger");
  if (!ok) return;
  logout();
  await clearCache();
  window.location.href = "/todo-html/index.html";
});
