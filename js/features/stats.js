/**
 * Stats calculations and Chart.js rendering.
 * @module features/stats
 */

import { Chart } from "chart.js/auto";
import { getState } from "../core/state.js";
import { calcStreak } from "./streak.js";
import { isToday, isWithinDays } from "../utils/date.js";
import { formatNumber, formatPercent } from "../utils/format.js";

/**
 * Compute summary statistics.
 * @returns {object}
 */
export function computeStats() {
  const tasks      = getState("tasks") || [];
  const active     = tasks.filter((t) => !t.deletedAt && !t.archivedAt);
  const completed  = active.filter((t) => t.completed);
  const totalToday = active.filter((t) => isToday(new Date(t.createdAt)));
  const doneToday  = completed.filter((t) => t.completedAt && isToday(new Date(t.completedAt)));
  const overdue    = active.filter((t) => t.dueAt && !t.completed && new Date(t.dueAt) < new Date());

  const streak     = calcStreak(tasks);
  const bestStreak = (getState("stats") || {}).bestStreak || streak;

  const completionRate = active.length ? (completed.length / active.length) * 100 : 0;

  return {
    total:          active.length,
    completed:      completed.length,
    pending:        active.length - completed.length,
    overdue:        overdue.length,
    doneToday:      doneToday.length,
    createdToday:   totalToday.length,
    completionRate,
    streak,
    bestStreak,
  };
}

/**
 * Build the 7-day completion bar chart.
 * @param {HTMLCanvasElement} canvas
 * @returns {Chart}
 */
export function renderWeeklyChart(canvas) {
  const tasks     = getState("tasks") || [];
  const labels    = [];
  const data      = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    labels.push(d.toLocaleDateString("az-AZ", { weekday: "short" }));
    data.push(
      tasks.filter((t) => t.completed && t.completedAt && t.completedAt.slice(0, 10) === key).length
    );
  }

  return new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Tamamlanan",
        data,
        backgroundColor: "rgba(99,102,241,0.7)",
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "var(--text-muted)" } },
        y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "var(--text-muted)", precision: 0 } },
      },
    },
  });
}

/**
 * Build a category distribution donut chart.
 * @param {HTMLCanvasElement} canvas
 * @returns {Chart}
 */
export function renderCategoryChart(canvas) {
  const tasks      = getState("tasks") || [];
  const categories = getState("categories") || [];
  const active     = tasks.filter((t) => !t.deletedAt && !t.archivedAt);

  const catMap = {};
  for (const t of active) {
    const key = t.categoryId || "__none__";
    catMap[key] = (catMap[key] || 0) + 1;
  }

  const labels = [];
  const data   = [];
  const bg     = [];

  for (const [id, count] of Object.entries(catMap)) {
    const cat = categories.find((c) => c.id === id);
    labels.push(cat ? cat.name : "Digər");
    data.push(count);
    bg.push(cat?.color || "#6366f1");
  }

  return new Chart(canvas, {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: bg, borderWidth: 0 }] },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "right", labels: { color: "var(--text-secondary)", boxWidth: 12, borderRadius: 4, padding: 10 } },
      },
      cutout: "68%",
    },
  });
}

/**
 * Build a 52-week heatmap (GitHub-style).
 * @param {HTMLElement} container
 */
export function renderHeatmap(container) {
  container.innerHTML = "";
  const tasks = getState("tasks") || [];

  // Count completions per day for the last 364 days
  const map = {};
  for (const t of tasks) {
    if (t.completed && t.completedAt) {
      const key = t.completedAt.slice(0, 10);
      map[key] = (map[key] || 0) + 1;
    }
  }

  const today = new Date();
  const COLS  = 52;
  const ROWS  = 7;

  // Container grid
  container.style.cssText = `display:grid;grid-template-columns:repeat(${COLS},1fr);grid-template-rows:repeat(${ROWS},1fr);gap:2px;`;

  for (let col = COLS - 1; col >= 0; col--) {
    for (let row = ROWS - 1; row >= 0; row--) {
      const d = new Date(today);
      d.setDate(d.getDate() - (col * 7 + row));
      const key   = d.toISOString().slice(0, 10);
      const count = map[key] || 0;
      const heat  = count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4;

      const cell = document.createElement("div");
      cell.dataset.date  = key;
      cell.dataset.count = count;
      cell.title = `${key}: ${count} task`;
      cell.style.cssText = `border-radius:2px;aspect-ratio:1;background:var(--heat-${heat});transition:opacity var(--t-fast);`;
      cell.style.gridColumn = COLS - col;
      cell.style.gridRow    = row + 1;
      container.appendChild(cell);
    }
  }
}
