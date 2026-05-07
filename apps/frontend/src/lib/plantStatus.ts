/**
 * Derives the display status of a plant from its tasks[].
 *
 * The backend now produces one task per schedule (not one per week),
 * and task.status is computed from the schedule window vs. current week.
 * We can trust task.status directly.
 *
 * Priority order: overdue > due > upcoming > ok
 */

import type { Plant } from "@api/plant";
import type { Task } from "@api/task";

export type PlantStatus = "overdue" | "due" | "upcoming" | "ok";

/**
 * Derives plant status from tasks[]. Priority: overdue > due > upcoming > ok.
 */
export function derivePlantStatus(plant: Pick<Plant, "tasks">): PlantStatus {
  const tasks = plant.tasks;
  if (tasks.some((t) => t.status === "overdue"))  return "overdue";
  if (tasks.some((t) => t.status === "due"))       return "due";
  if (tasks.some((t) => t.status === "upcoming"))  return "upcoming";
  return "ok";
}

/** The most urgent open task (overdue > due > upcoming). */
export function nextTask(plant: Pick<Plant, "tasks">): Task | null {
  return nextCareTask(plant);
}

/**
 * The most urgent care task. Backend guarantees one task per schedule
 * and correct status — no deduplication needed.
 */
export function nextCareTask(plant: Pick<Plant, "tasks">): Task | null {
  const order: PlantStatus[] = ["overdue", "due", "upcoming"];
  for (const s of order) {
    const t = plant.tasks.find((t) => t.status === s);
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
