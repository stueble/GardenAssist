/**
 * Derives the display status of a plant from its tasks[].
 *
 * Priority order: overdue > due > upcoming > ok
 * - overdue:  any task with status "overdue"
 * - due:      any task with status "due"
 * - upcoming: any task with status "upcoming"
 * - ok:       no open tasks
 */

import type { Plant } from "@api/plant";
import type { Task } from "@api/task";

export type PlantStatus = "overdue" | "due" | "upcoming" | "ok";

/**
 * Schedule types that represent actionable care tasks.
 * bloom and foliage are informational/decorative — never shown as todos.
 */
const CARE_TYPES = ["pruning", "fertilization", "growth", "misc"];

function isCareTask(t: Task): boolean {
  return CARE_TYPES.includes(t.schedule.schedule_type);
}

/** Current ISO week number (1–53). */
function currentIsoWeek(): number {
  const now  = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const diff = now.getTime() - jan4.getTime();
  return Math.ceil((diff / 86400000 + jan4.getDay() + 1) / 7);
}

/**
 * Derives the status of a schedule window relative to the current week.
 * - overdue:  end_week < currentWeek  (window has passed)
 * - due:      start_week <= currentWeek <= end_week  (currently active)
 * - upcoming: start_week > currentWeek  (not yet started)
 */
function scheduleWindowStatus(schedule: Task["schedule"]): PlantStatus {
  const cw = currentIsoWeek();
  if (schedule.end_week < cw)   return "overdue";
  if (schedule.start_week > cw) return "upcoming";
  return "due";
}

/**
 * Derives plant status from care schedule windows (not per-week task entries).
 * Priority: overdue > due > upcoming > ok
 */
export function derivePlantStatus(plant: Pick<Plant, "tasks">): PlantStatus {
  // Deduplicate by schedule id — one status per schedule window
  const seen = new Set<string>();
  const statuses: PlantStatus[] = [];
  for (const t of plant.tasks) {
    if (!isCareTask(t)) continue;
    if (seen.has(t.schedule.id)) continue;
    seen.add(t.schedule.id);
    statuses.push(scheduleWindowStatus(t.schedule));
  }
  if (statuses.includes("overdue"))  return "overdue";
  if (statuses.includes("due"))      return "due";
  if (statuses.includes("upcoming")) return "upcoming";
  return "ok";
}

/** The most urgent open *care* task (overdue > due > upcoming). */
export function nextTask(plant: Pick<Plant, "tasks">): Task | null {
  return nextCareTask(plant);
}

/**
 * The most urgent open care task based on schedule window status.
 * Returns one representative task per schedule (the first occurrence).
 */
export function nextCareTask(plant: Pick<Plant, "tasks">): Task | null {
  const seen = new Set<string>();
  // Collect one task per schedule, deduplicated
  const careTasks: Task[] = [];
  for (const t of plant.tasks) {
    if (!isCareTask(t)) continue;
    if (seen.has(t.schedule.id)) continue;
    seen.add(t.schedule.id);
    careTasks.push(t);
  }
  // Sort by window status: overdue > due > upcoming
  const order: PlantStatus[] = ["overdue", "due", "upcoming"];
  for (const s of order) {
    const t = careTasks.find((t) => scheduleWindowStatus(t.schedule) === s);
    if (t) return t;
  }
  return null;
}

/** Status → dot color (CSS variable string). */
export const STATUS_COLOR: Record<PlantStatus, string> = {
  overdue:  "var(--red-warn)",
  due:      "var(--yellow-warn)",
  upcoming: "var(--blue-mid)",
  ok:       "var(--green-light)",
};

/** Status → pill background color. */
export const STATUS_BG: Record<PlantStatus, string> = {
  overdue:  "var(--red-soft)",
  due:      "var(--yellow-soft)",
  upcoming: "var(--blue-soft)",
  ok:       "var(--green-mist)",
};

/** Status → pill text color. */
export const STATUS_TEXT: Record<PlantStatus, string> = {
  overdue:  "var(--red-warn)",
  due:      "var(--yellow-warn)",
  upcoming: "var(--blue-mid)",
  ok:       "var(--green-mid)",
};

/** Status → icon. */
export const STATUS_ICON: Record<PlantStatus, string> = {
  overdue:  "🔴",
  due:      "🟡",
  upcoming: "🔵",
  ok:       "✅",
};
