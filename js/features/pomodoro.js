/**
 * Pomodoro timer feature.
 * @module features/pomodoro
 */

import { getState, setState } from "../core/state.js";
import { debouncedSave } from "../core/storage.js";
import { formatTimer } from "../utils/format.js";
import { playSound } from "./tasks.js";
import { toastInfo } from "../ui/toast.js";
import { i18n } from "../config.js";

const CIRCUMFERENCE = 2 * Math.PI * 110; // r=110

/** @typedef {"work"|"short"|"long"} Phase */

const state = {
  phase:        /** @type {Phase} */ ("work"),
  remaining:    0,
  total:        0,
  running:      false,
  session:      0,      // completed work sessions in current cycle
  currentTaskId: null,
  _interval:    null,
};

/** @type {Function[]} */
const _listeners = [];

/**
 * Subscribe to Pomodoro state changes.
 * @param {function(object): void} fn
 * @returns {function(): void}  unsubscribe
 */
export function onPomodoroChange(fn) {
  _listeners.push(fn);
  return () => _listeners.splice(_listeners.indexOf(fn), 1);
}

function notify() {
  const snap = { ...state, _interval: undefined };
  _listeners.forEach((fn) => fn(snap));
}

/**
 * Get settings for work/break durations.
 * @returns {{work:number, short:number, long:number, every:number}}
 */
function getDurations() {
  const s = getState("settings") || {};
  return {
    work:  (s.pomodoroWork        || 25) * 60,
    short: (s.pomodoroShortBreak  || 5)  * 60,
    long:  (s.pomodoroLongBreak   || 15) * 60,
    every: (s.pomodoroLongBreakEvery || 4),
  };
}

/**
 * Initialise the timer with the current phase duration.
 * @param {Phase} [phase="work"]
 */
export function initTimer(phase = "work") {
  const d = getDurations();
  state.phase     = phase;
  state.total     = phase === "work" ? d.work : phase === "short" ? d.short : d.long;
  state.remaining = state.total;
  state.running   = false;
  clearInterval(state._interval);
  state._interval = null;
  notify();
}

/**
 * Start or resume the timer.
 */
export function startTimer() {
  if (state.running) return;
  state.running = true;
  state._interval = setInterval(() => {
    state.remaining--;
    if (state.remaining <= 0) {
      state.remaining = 0;
      clearInterval(state._interval);
      state._interval = null;
      state.running = false;
      onPhaseComplete();
    }
    notify();
  }, 1000);
  notify();
}

/**
 * Pause the timer.
 */
export function pauseTimer() {
  clearInterval(state._interval);
  state._interval = null;
  state.running   = false;
  notify();
}

/**
 * Reset the current phase.
 */
export function resetTimer() {
  clearInterval(state._interval);
  state._interval = null;
  state.running   = false;
  state.remaining = state.total;
  notify();
}

/**
 * Skip to the next phase.
 */
export function skipTimer() {
  clearInterval(state._interval);
  state._interval = null;
  state.running   = false;
  onPhaseComplete();
}

/**
 * Set the active task id.
 * @param {string|null} id
 */
export function setPomodoroTask(id) {
  state.currentTaskId = id;
  notify();
}

/**
 * Called when a phase completes.
 */
function onPhaseComplete() {
  const d = getDurations();

  if (state.phase === "work") {
    state.session++;
    playSound("pomodoro-end");
    toastInfo(i18n.pomodoroEnd, 5000);

    // Record stats
    const today = new Date().toISOString().slice(0, 10);
    const stats  = { ...(getState("stats") || {}) };
    const sessions = [...(stats.pomodoroSessions || [])];
    const todayIdx = sessions.findIndex((s) => s.date === today);
    if (todayIdx >= 0) {
      sessions[todayIdx] = {
        ...sessions[todayIdx],
        workMinutes: sessions[todayIdx].workMinutes + Math.floor((d.work - state.remaining) / 60),
        sessions: sessions[todayIdx].sessions + 1,
      };
    } else {
      sessions.push({ date: today, workMinutes: d.work / 60, sessions: 1 });
    }
    stats.pomodoroSessions = sessions;
    setState("stats", stats);
    debouncedSave(getState());

    // Decide break type
    const nextPhase = (state.session % d.every === 0) ? "long" : "short";
    initTimer(nextPhase);
  } else {
    toastInfo(i18n.breakEnd, 5000);
    initTimer("work");
  }

  // Vibrate on mobile
  navigator.vibrate?.([200, 100, 200]);

  // Service worker notification
  if (Notification.permission === "granted") {
    navigator.serviceWorker?.ready.then((reg) => {
      reg.showNotification(
        state.phase === "work" ? i18n.pomodoroEnd : i18n.breakEnd,
        { icon: "/todo-html/assets/icons/icon-192.png", silent: false }
      );
    });
  }
}

/**
 * Get the current timer display string.
 * @returns {string}
 */
export function getTimerDisplay() {
  return formatTimer(state.remaining);
}

/**
 * Get SVG ring stroke-dashoffset for current progress.
 * @returns {number}
 */
export function getRingOffset() {
  if (!state.total) return CIRCUMFERENCE;
  return CIRCUMFERENCE * (1 - state.remaining / state.total);
}

/**
 * Get current Pomodoro state snapshot.
 * @returns {object}
 */
export function getPomodoroState() {
  return { ...state, _interval: undefined };
}
