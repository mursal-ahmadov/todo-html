/**
 * Streak tracking and milestones.
 * @module features/streak
 */

import { getState, setState } from "../core/state.js";
import { debouncedSave } from "../core/storage.js";
import { toastSuccess } from "../ui/toast.js";

const MILESTONES = [3, 7, 14, 30, 60, 100];

/**
 * Calculate the current daily completion streak.
 * A "day" counts if at least one task was completed.
 * @param {object[]} tasks
 * @returns {number}
 */
export function calcStreak(tasks) {
  const completedDates = new Set(
    tasks
      .filter((t) => t.completed && t.completedAt)
      .map((t) => t.completedAt.slice(0, 10))
  );

  let streak = 0;
  const today = new Date();

  for (let i = 0; i <= 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (completedDates.has(key)) {
      streak++;
    } else if (i > 0) {
      break; // Streak broken
    }
  }
  return streak;
}

/**
 * Update the stored streak count and fire milestone celebrations.
 * @param {number} newStreak
 */
export function updateStreak(newStreak) {
  const stats = { ...(getState("stats") || {}) };
  const prevStreak  = stats.streak || 0;
  const prevBest    = stats.bestStreak || 0;

  stats.streak     = newStreak;
  stats.bestStreak = Math.max(newStreak, prevBest);

  if (newStreak > prevStreak) {
    for (const milestone of MILESTONES) {
      if (newStreak === milestone) {
        triggerMilestoneCelebration(milestone);
        break;
      }
    }
  }

  setState("stats", stats);
  debouncedSave(getState());
}

/**
 * Fire confetti and toast for a streak milestone.
 * @param {number} days
 */
function triggerMilestoneCelebration(days) {
  toastSuccess(`🎉 ${days} günlük series! Əla işləyirsən!`, 6000);
  launchConfetti();
}

/**
 * Canvas-based confetti effect.
 */
function launchConfetti() {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;";
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const particles = [];
  const COLORS = ["#6366f1","#ec4899","#10b981","#f59e0b","#3b82f6","#ef4444"];
  const COUNT = 120;

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x:   Math.random() * canvas.width,
      y:   -10 - Math.random() * 200,
      r:   3 + Math.random() * 5,
      d:   2 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      tilt: Math.random() * 10 - 10,
      tiltAng: 0,
      tiltAngInc: 0.07 + Math.random() * 0.05,
    });
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
      ctx.stroke();
    });
    update();
    frame++;
    if (frame < 180) requestAnimationFrame(draw);
    else canvas.remove();
  }

  function update() {
    particles.forEach((p) => {
      p.tiltAng += p.tiltAngInc;
      p.y += (Math.cos(frame / 16) + p.d) * 0.5;
      p.x += Math.sin(frame / 8) * 0.5;
      p.tilt = Math.sin(p.tiltAng) * 12;
    });
  }

  requestAnimationFrame(draw);
}
