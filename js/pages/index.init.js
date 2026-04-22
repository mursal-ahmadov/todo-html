/**
 * index.html initialisation — Auth page.
 * @module pages/index.init
 */

import { hasStoredAuth, setupAuth, unlockAuth, isAuthenticated, logout } from "../core/auth.js";
import { loadData, createDataRepo, getGitHubUser } from "../core/storage.js";
import { initState, setState } from "../core/state.js";
import { redirectToApp } from "../core/router.js";
import { loadTheme } from "../features/theme.js";
import { toastError, toastSuccess } from "../ui/toast.js";
import { showLoader } from "../ui/loader.js";
import { $ } from "../utils/dom.js";
import { i18n, BASE_PATH } from "../config.js";

loadTheme();

const setupView    = document.getElementById("setup-view");
const unlockView   = document.getElementById("unlock-view");
const setupForm    = document.getElementById("setup-form");
const unlockForm   = document.getElementById("unlock-form");
const tokenInput   = document.getElementById("token-input");
const passPhraseIn = document.getElementById("passphrase-input");
const passphraseIn2 = document.getElementById("passphrase-confirm");
const unlockPassIn = document.getElementById("unlock-passphrase");
const repoInput    = document.getElementById("repo-name");
const createRepoChk = document.getElementById("create-repo");
const logoutBtn    = document.getElementById("auth-logout");
const strengthBar  = document.getElementById("strength-bar");

// ── Decide which view to show
function showView(show, hide) {
  show?.removeAttribute("hidden");
  hide?.setAttribute("hidden", "");
}

if (hasStoredAuth()) {
  showView(unlockView, setupView);
} else {
  showView(setupView, unlockView);
}

// ── Passphrase strength meter (setup view)
passPhraseIn?.addEventListener("input", () => {
  const s = scorePassphrase(passPhraseIn.value);
  if (!strengthBar) return;
  strengthBar.dataset.strength = s.label;
  strengthBar.style.setProperty("--strength-pct", s.pct + "%");
});

function scorePassphrase(p) {
  let score = 0;
  if (p.length >= 8)   score++;
  if (p.length >= 14)  score++;
  if (/[A-Z]/.test(p)) score++;
  if (/\d/.test(p))    score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  const levels = [
    { label: "weak",   pct: 20 },
    { label: "weak",   pct: 20 },
    { label: "fair",   pct: 50 },
    { label: "good",   pct: 75 },
    { label: "strong", pct: 100 },
    { label: "strong", pct: 100 },
  ];
  return levels[score];
}

// ── Setup form submit
setupForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const token      = tokenInput.value.trim();
  const passphrase = passPhraseIn.value;
  const confirm    = passphraseIn2?.value;
  const repo       = repoInput?.value.trim() || "todo-data";
  const doCreate   = createRepoChk?.checked;

  if (!token || !passphrase) return;
  if (passphraseIn2 && passphrase !== confirm) {
    passphraseIn2.classList.add("animate-shake");
    toastError("Şifrələr uyğun gəlmir");
    return;
  }

  const loader = showLoader("Qoşulur…");
  try {
    await setupAuth(token, passphrase, repo);
    if (doCreate) {
      await createDataRepo(repo);
    }
    const data = await loadData();
    initState(data);
    toastSuccess("Uğurla daxil oldunuz!");
    redirectToApp();
  } catch (err) {
    toastError(err.message || i18n.errorUnknown);
  } finally {
    loader.hide();
  }
});

// ── Unlock form submit
unlockForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const passphrase = unlockPassIn.value;
  if (!passphrase) return;

  const loader = showLoader("Açılır…");
  try {
    const ok = await unlockAuth(passphrase);
    if (!ok) { toastError(i18n.wrongPassphrase); return; }
    const data = await loadData();
    initState(data);
    toastSuccess("Xoş gəldiniz!");
    redirectToApp();
  } catch (err) {
    toastError(err.message || i18n.errorUnknown);
  } finally {
    loader.hide();
  }
});

// ── Logout (reset) button
logoutBtn?.addEventListener("click", () => {
  logout();
  showView(setupView, unlockView);
});
