/**
 * stats.html initialisation.
 * @module pages/stats.init
 */

import { guardRoute } from "../core/router.js";
import { loadData } from "../core/storage.js";
import { initState } from "../core/state.js";
import { loadTheme } from "../features/theme.js";
import { injectNav } from "../ui/nav.js";
import { computeStats, renderWeeklyChart, renderCategoryChart, renderHeatmap } from "../features/stats.js";
import { updateStreak } from "../features/streak.js";
import { toastError } from "../ui/toast.js";
import { formatNumber, formatPercent } from "../utils/format.js";
import { i18n } from "../config.js";

guardRoute();
loadTheme();
injectNav("stats.html");

(async () => {
  try {
    const data = await loadData();
    initState(data);
    renderStats();
  } catch (err) {
    toastError(err.message || i18n.errorUnknown);
  }
})();

function renderStats() {
  const stats = computeStats();
  updateStreak(stats.streak);

  // Stat tiles
  setText("stat-total",       formatNumber(stats.total));
  setText("stat-completed",   formatNumber(stats.completed));
  setText("stat-pending",     formatNumber(stats.pending));
  setText("stat-overdue",     formatNumber(stats.overdue));
  setText("stat-done-today",  formatNumber(stats.doneToday));
  setText("stat-rate",        formatPercent(stats.completionRate));
  setText("stat-streak",      stats.streak + " gün");
  setText("stat-best-streak", stats.bestStreak + " gün");

  // Charts
  const weeklyCanvas   = document.getElementById("chart-weekly");
  const categoryCanvas = document.getElementById("chart-category");
  const heatmapEl      = document.getElementById("heatmap");

  if (weeklyCanvas)   renderWeeklyChart(weeklyCanvas);
  if (categoryCanvas) renderCategoryChart(categoryCanvas);
  if (heatmapEl)      renderHeatmap(heatmapEl);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
