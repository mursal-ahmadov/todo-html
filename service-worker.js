/**
 * Service Worker — Todo PWA
 * Strategy:
 *   - App shell (HTML, CSS, JS): Cache-first with stale-while-revalidate
 *   - GitHub API: Network-first with cache fallback
 *   - CDN (jsdelivr): Cache-first, long-lived
 *   - Unknown: Network-only, fallback to offline.html
 */

const CACHE_VERSION = "todo-v1";
const OFFLINE_URL   = "/todo-html/offline.html";

const APP_SHELL = [
  "/todo-html/",
  "/todo-html/index.html",
  "/todo-html/app.html",
  "/todo-html/pomodoro.html",
  "/todo-html/stats.html",
  "/todo-html/archive.html",
  "/todo-html/settings.html",
  "/todo-html/offline.html",
  "/todo-html/manifest.webmanifest",
  "/todo-html/assets/favicon.svg",
  // CSS
  "/todo-html/css/reset.css",
  "/todo-html/css/tokens.css",
  "/todo-html/css/base.css",
  "/todo-html/css/glass.css",
  "/todo-html/css/animations.css",
  "/todo-html/css/components.css",
  "/todo-html/css/layout.css",
  "/todo-html/css/themes.css",
  "/todo-html/css/pages/auth.css",
  "/todo-html/css/pages/app.css",
  "/todo-html/css/pages/pomodoro.css",
  "/todo-html/css/pages/stats.css",
  "/todo-html/css/pages/archive.css",
  "/todo-html/css/pages/settings.css",
  // JS core
  "/todo-html/js/config.js",
  "/todo-html/js/utils/date.js",
  "/todo-html/js/utils/id.js",
  "/todo-html/js/utils/debounce.js",
  "/todo-html/js/utils/format.js",
  "/todo-html/js/utils/dom.js",
  "/todo-html/js/core/crypto.js",
  "/todo-html/js/core/auth.js",
  "/todo-html/js/core/storage.js",
  "/todo-html/js/core/state.js",
  "/todo-html/js/core/cache.js",
  "/todo-html/js/core/router.js",
  // JS UI
  "/todo-html/js/ui/toast.js",
  "/todo-html/js/ui/modal.js",
  "/todo-html/js/ui/confirm.js",
  "/todo-html/js/ui/loader.js",
  "/todo-html/js/ui/empty.js",
  "/todo-html/js/ui/nav.js",
  // JS features
  "/todo-html/js/features/theme.js",
  "/todo-html/js/features/tasks.js",
  "/todo-html/js/features/taskModal.js",
  "/todo-html/js/features/categories.js",
  "/todo-html/js/features/tags.js",
  "/todo-html/js/features/recurring.js",
  "/todo-html/js/features/search.js",
  "/todo-html/js/features/dragdrop.js",
  "/todo-html/js/features/shortcuts.js",
  "/todo-html/js/features/markdown.js",
  "/todo-html/js/features/notifications.js",
  "/todo-html/js/features/pomodoro.js",
  "/todo-html/js/features/stats.js",
  "/todo-html/js/features/streak.js",
  // JS pages
  "/todo-html/js/pages/index.init.js",
  "/todo-html/js/pages/app.init.js",
  "/todo-html/js/pages/pomodoro.init.js",
  "/todo-html/js/pages/stats.init.js",
  "/todo-html/js/pages/archive.init.js",
  "/todo-html/js/pages/settings.init.js",
];

// ── Install: cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ── Activate: remove old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // GitHub API → network-first
  if (url.hostname === "api.github.com") {
    event.respondWith(networkFirst(request));
    return;
  }

  // CDN (jsdelivr, unpkg) → cache-first, long-lived
  if (url.hostname.includes("jsdelivr") || url.hostname.includes("unpkg")) {
    event.respondWith(cacheFirst(request, true));
    return;
  }

  // App shell & local assets → cache-first with background revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Fallback: network-only
  event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
});

async function cacheFirst(request, longLived = false) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return caches.match(OFFLINE_URL);
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: "offline" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      caches.open(CACHE_VERSION).then((cache) => cache.put(request, response.clone()));
    }
    return response;
  }).catch(() => null);
  return cached || (await fetchPromise) || caches.match(OFFLINE_URL);
}

// ── Scheduled notification timers (postMessage from client)
const _timers = {};

self.addEventListener("message", (event) => {
  if (event.data?.type !== "SCHEDULE_NOTIFICATION") return;
  const { taskId, title, body, delay } = event.data.payload;
  if (_timers[taskId]) clearTimeout(_timers[taskId]);
  _timers[taskId] = setTimeout(() => {
    self.registration.showNotification(title, {
      body,
      icon: "/todo-html/assets/icons/icon-192.png",
      badge: "/todo-html/assets/icons/icon-192.png",
      tag: "task-" + taskId,
      renotify: true,
      data: { taskId },
    });
    delete _timers[taskId];
  }, Math.max(0, delay));
});

// ── Notification click → open app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes("/todo-html/"));
      if (existing) return existing.focus();
      return clients.openWindow("/todo-html/app.html");
    })
  );
});
