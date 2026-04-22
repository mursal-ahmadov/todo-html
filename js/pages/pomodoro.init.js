/**
 * pomodoro.html initialisation.
 * @module pages/pomodoro.init
 */

import { guardRoute } from "../core/router.js";
import { loadData } from "../core/storage.js";
import { initState, getState } from "../core/state.js";
import { loadTheme } from "../features/theme.js";
import { injectNav } from "../ui/nav.js";
import {
  initTimer, startTimer, pauseTimer, resetTimer, skipTimer,
  onPomodoroChange, getTimerDisplay, getRingOffset, getPomodoroState,
  setPomodoroTask,
} from "../features/pomodoro.js";
import { toastError } from "../ui/toast.js";
import { $, $$ } from "../utils/dom.js";
import { i18n } from "../config.js";

guardRoute();
loadTheme();
injectNav("pomodoro.html");

const timerDisplay   = document.getElementById("timer-display");
const ringProgress   = document.getElementById("ring-progress");
const phaseLabel     = document.getElementById("phase-label");
const sessionDots    = document.getElementById("session-dots");
const startPauseBtn  = document.getElementById("start-pause-btn");
const resetBtn       = document.getElementById("reset-btn");
const skipBtn        = document.getElementById("skip-btn");
const taskSelect     = document.getElementById("pomodoro-task-select");
const CIRCUMFERENCE  = 2 * Math.PI * 110;

const PHASE_LABELS = { work: "🍅 Çalışma", short: "☕ Qısa fasilə", long: "🛌 Uzun fasilə" };

// ── Boot
(async () => {
  try {
    const data = await loadData();
    initState(data);
    populateTaskSelect();
  } catch (err) {
    toastError(err.message || i18n.errorUnknown);
  }
})();

function populateTaskSelect() {
  if (!taskSelect) return;
  taskSelect.innerHTML = `<option value="">— Task seç (isteğe bağlı) —</option>`;
  const tasks = (getState("tasks") || []).filter((t) => !t.completed && !t.deletedAt);
  for (const t of tasks) {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.title;
    taskSelect.appendChild(opt);
  }
}

taskSelect?.addEventListener("change", () => setPomodoroTask(taskSelect.value || null));

// ── Timer init
initTimer("work");

// ── Subscribe
onPomodoroChange(render);

function render(state) {
  if (timerDisplay) timerDisplay.textContent = getTimerDisplay();
  if (ringProgress) {
    const offset = CIRCUMFERENCE - getRingOffset();
    ringProgress.style.strokeDashoffset = offset;
    ringProgress.style.stroke = state.phase === "work" ? "var(--accent)" : "#10b981";
  }
  if (phaseLabel) phaseLabel.textContent = PHASE_LABELS[state.phase] || "";
  if (startPauseBtn) {
    startPauseBtn.innerHTML = state.running
      ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
      : `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`;
  }
  renderSessionDots(state.session, (getState("settings") || {}).pomodoroLongBreakEvery || 4);
}

function renderSessionDots(done, every) {
  if (!sessionDots) return;
  sessionDots.innerHTML = "";
  for (let i = 0; i < every; i++) {
    const dot = document.createElement("div");
    dot.className = "session-dot" + (i < done % every ? " filled" : "");
    sessionDots.appendChild(dot);
  }
}

// ── Controls
startPauseBtn?.addEventListener("click", () => {
  const s = getPomodoroState();
  s.running ? pauseTimer() : startTimer();
});
resetBtn?.addEventListener("click", resetTimer);
skipBtn?.addEventListener("click",  skipTimer);

// Phase pill buttons
$$("[data-phase]").forEach((btn) => {
  btn.addEventListener("click", () => {
    initTimer(btn.dataset.phase);
    $$("[data-phase]").forEach((b) => b.classList.toggle("active", b === btn));
  });
});
