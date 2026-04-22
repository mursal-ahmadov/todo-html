/**
 * Shared navigation component.
 * Call injectNav() on every page to render the top nav bar.
 * @module ui/nav
 */

import { BASE_PATH } from "../config.js";
import { logout } from "../core/auth.js";
import { el } from "../utils/dom.js";
import { applyTheme } from "../features/theme.js";

const PAGES = [
  { href: `${BASE_PATH}/app.html`,      label: "Tasklar",  icon: "✓" },
  { href: `${BASE_PATH}/pomodoro.html`, label: "Pomodoro", icon: "🍅" },
  { href: `${BASE_PATH}/stats.html`,    label: "Statistika", icon: "📊" },
  { href: `${BASE_PATH}/archive.html`,  label: "Arxiv",    icon: "📦" },
  { href: `${BASE_PATH}/settings.html`, label: "Ayarlar",  icon: "⚙" },
];

/**
 * Inject the top navigation bar into the page.
 * @param {string} activeHref  current page path (matches PAGES[].href)
 */
export function injectNav(activeHref) {
  const nav = el("nav", { class: "top-nav", role: "navigation", "aria-label": "Əsas naviqasiya" });

  // Logo
  const logo = el("a", { href: `${BASE_PATH}/app.html`, class: "nav-logo", "aria-label": "Todo ana səhifə" });
  logo.textContent = "Todo";

  // Hamburger
  const hamburger = el("button", {
    class: "nav-hamburger btn-icon",
    "aria-label": "Menyunu aç/bağla",
    "aria-expanded": "false",
    type: "button",
  });
  hamburger.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>`;

  // Nav links
  const linksWrap = el("div", { class: "nav-links", role: "list" });
  for (const page of PAGES) {
    const a = el("a", {
      href: page.href,
      class: `nav-link${page.href === activeHref ? " active" : ""}`,
      "aria-current": page.href === activeHref ? "page" : undefined,
    });
    a.textContent = page.label;
    linksWrap.appendChild(a);
  }

  // Actions
  const actions = el("div", { class: "nav-actions" });

  // Theme toggle
  const themeBtn = el("button", {
    id: "theme-toggle",
    class: "btn-icon-round",
    "aria-label": "Tema dəyiş",
    type: "button",
  });
  themeBtn.innerHTML = `
    <span class="icon-sun" aria-hidden="true">☀️</span>
    <span class="icon-moon" aria-hidden="true">🌙</span>
  `;
  themeBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "auto";
    const next = current === "dark" ? "light" : current === "light" ? "auto" : "dark";
    applyTheme(next, true);
  });

  // Install button (shown only when installable)
  const installBtn = el("button", {
    id: "nav-install-btn",
    class: "btn btn-sm btn-secondary hidden",
    type: "button",
    "aria-label": "Tətbiqi yüklə",
  });
  installBtn.textContent = "⬇ Yüklə";

  // Logout
  const logoutBtn = el("button", {
    id: "nav-logout-btn",
    class: "btn-icon-round",
    "aria-label": "Çıxış",
    type: "button",
    title: "Çıxış",
  });
  logoutBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>`;
  logoutBtn.addEventListener("click", () => {
    logout();
    window.location.replace(`${BASE_PATH}/index.html`);
  });

  actions.append(themeBtn, installBtn, logoutBtn);
  nav.append(logo, hamburger, linksWrap, actions);

  // Mobile sidebar overlay
  const overlay = el("div", { class: "sidebar-overlay", id: "sidebar-overlay" });
  overlay.addEventListener("click", closeSidebar);

  document.body.prepend(overlay);
  document.body.prepend(nav);

  // Hamburger → toggle sidebar
  hamburger.addEventListener("click", () => {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;
    const open = sidebar.classList.toggle("open");
    overlay.classList.toggle("visible", open);
    hamburger.setAttribute("aria-expanded", String(open));
  });

  function closeSidebar() {
    const sidebar = document.querySelector(".sidebar");
    sidebar?.classList.remove("open");
    overlay.classList.remove("visible");
    hamburger.setAttribute("aria-expanded", "false");
  }
}
