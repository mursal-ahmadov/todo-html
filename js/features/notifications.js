/**
 * Push notification scheduler.
 * @module features/notifications
 */

import { getState } from "../core/state.js";
import { SW_PATH } from "../config.js";

/**
 * Request notification permission (soft-ask flow).
 * @returns {Promise<NotificationPermission>}
 */
export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
}

/**
 * Schedule reminder notifications for tasks with upcoming reminderAt.
 * Sends messages to the service worker.
 */
export async function scheduleReminders() {
  if (Notification.permission !== "granted") return;
  if (!navigator.serviceWorker?.controller) return;

  const tasks = getState("tasks") || [];
  const now   = Date.now();

  for (const task of tasks) {
    if (!task.reminderAt || task.completed || task.deletedAt) continue;
    const ts = new Date(task.reminderAt).getTime();
    if (ts <= now || ts > now + 24 * 60 * 60 * 1000) continue; // Only next 24h

    navigator.serviceWorker.controller.postMessage({
      type: "SCHEDULE_NOTIFICATION",
      payload: {
        taskId:  task.id,
        title:   "📋 " + task.title,
        body:    task.notes ? task.notes.slice(0, 80) : "Xatırlatma vaxtı gəldi.",
        delay:   ts - now,
      },
    });
  }
}

/**
 * Show an immediate test notification.
 */
export async function sendTestNotification() {
  const perm = await requestNotificationPermission();
  if (perm !== "granted") return;

  new Notification("Todo — Test Bildirişi ✓", {
    body: "Bildirişlər düzgün işləyir!",
    icon: "/todo-html/assets/icons/icon-192.png",
  });
}

/**
 * Show a banner prompting the user to enable notifications.
 * @param {function():void} [onAccept]
 */
export function showNotificationBanner(onAccept) {
  if (Notification.permission !== "default") return;
  if (document.getElementById("notif-banner")) return;

  const banner = document.createElement("div");
  banner.id = "notif-banner";
  banner.style.cssText = `
    position:fixed;bottom:var(--s-5);left:50%;transform:translateX(-50%);
    background:var(--glass-bg);backdrop-filter:var(--glass-blur);
    -webkit-backdrop-filter:var(--glass-blur);
    border:1px solid var(--glass-border);border-radius:var(--r-xl);
    padding:var(--s-3) var(--s-5);display:flex;align-items:center;
    gap:var(--s-4);box-shadow:var(--shadow-xl);z-index:var(--z-toast);
    font-size:var(--fs-sm);max-width:calc(100vw - 2rem);
    animation:slideUp 400ms cubic-bezier(0.68,-0.55,0.265,1.55) both;
  `;

  const text = document.createElement("span");
  text.textContent = "🔔 Xatırlatma bildirişlərini aktiv et?";
  text.style.cssText = "color:var(--text-secondary);flex:1;";

  const acceptBtn = document.createElement("button");
  acceptBtn.className = "btn btn-sm btn-primary";
  acceptBtn.textContent = "Bəli";
  acceptBtn.addEventListener("click", async () => {
    banner.remove();
    await requestNotificationPermission();
    onAccept?.();
  });

  const dismissBtn = document.createElement("button");
  dismissBtn.className = "btn-icon-round";
  dismissBtn.setAttribute("aria-label", "Bağla");
  dismissBtn.textContent = "×";
  dismissBtn.style.cssText = "font-size:18px;color:var(--text-muted);";
  dismissBtn.addEventListener("click", () => banner.remove());

  banner.append(text, acceptBtn, dismissBtn);
  document.body.appendChild(banner);
}
