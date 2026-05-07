/**
 * Task derivation logic (ADR-005).
 *
 * One task is generated per Schedule (not one per week). Status is derived
 * from the schedule's time window relative to the current week:
 * - overdue:  end_week < currentWeekNumber  (window has passed)
 * - due:      start_week ≤ currentWeekNumber ≤ end_week  (active now)
 * - upcoming: start_week > currentWeekNumber  (not yet started)
 *
 * A schedule is suppressed (no task generated) if any JournalEntry of type
 * "done" or "skipped" references that schedule_id — regardless of the week
 * field. This means one "Done" action resolves the entire schedule for the
 * current period.
 *
 * task.week is set to the current ISO week (when the task was evaluated).
 * Journal entries carry the concrete date (date field) of the action.
 *
 * Week numbers are ISO 8601 weeks (Monday = first day, 1–53).
 */

import type { Task, TaskStatus } from "@api/task.js";
import type { Schedule } from "@api/schedule.js";
import type { JournalEntry } from "@api/journal-entry.js";

// ── ISO week helpers ──────────────────────────────────────────────────────────

/**
 * Returns the ISO 8601 week number (1–53) for a given Date.
 */
export function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Thursday in current week decides the year
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Returns the ISO 8601 year for a given Date (may differ from calendar year
 * near year boundaries).
 */
export function isoWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return d.getUTCFullYear();
}

/**
 * Formats a Date as an ISO 8601 week string: "YYYY-Www".
 */
export function toIsoWeek(date: Date): string {
  const week = isoWeekNumber(date);
  const year = isoWeekYear(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/**
 * Parses an ISO week string "YYYY-Www" into { year, week }.
 */
export function parseIsoWeek(w: string): { year: number; week: number } {
  const m = w.match(/^(\d{4})-W(\d{2})$/);
  if (!m) throw new Error(`Invalid ISO week: ${w}`);
  return { year: Number(m[1]), week: Number(m[2]) };
}

/**
 * Returns the Date of the Monday of a given ISO week.
 */
export function isoWeekToDate(year: number, week: number): Date {
  // Jan 4 is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7; // 1=Mon … 7=Sun
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday;
}

/**
 * Returns all ISO week strings within [startWeek, endWeek] for a given year,
 * handling year-end wrapping (end_week < start_week).
 *
 * The window is bounded by [windowStart, windowEnd] ISO week strings.
 */
export function expandScheduleWeeks(
  schedule: Pick<Schedule, "start_week" | "end_week">,
  windowStart: string,
  windowEnd: string,
): string[] {
  const { year: wsYear, week: wsWeek } = parseIsoWeek(windowStart);
  const { year: weYear, week: weWeek } = parseIsoWeek(windowEnd);

  const results: string[] = [];

  // Iterate year by year across the window
  for (let year = wsYear; year <= weYear; year++) {
    const maxWeek = weeksInYear(year);

    if (schedule.end_week >= schedule.start_week) {
      // Normal range: e.g. W10–W20
      for (let w = schedule.start_week; w <= schedule.end_week; w++) {
        const candidate = `${year}-W${String(w).padStart(2, "0")}`;
        if (candidate >= windowStart && candidate <= windowEnd) {
          results.push(candidate);
        }
      }
    } else {
      // Wrapping range: e.g. W48–W06 (spans year boundary)
      // Part 1: start_week to end of year
      for (let w = schedule.start_week; w <= maxWeek; w++) {
        const candidate = `${year}-W${String(w).padStart(2, "0")}`;
        if (candidate >= windowStart && candidate <= windowEnd) {
          results.push(candidate);
        }
      }
      // Part 2: start of next year to end_week
      const nextYear = year + 1;
      for (let w = 1; w <= schedule.end_week; w++) {
        const candidate = `${nextYear}-W${String(w).padStart(2, "0")}`;
        if (candidate >= windowStart && candidate <= windowEnd) {
          results.push(candidate);
        }
      }
    }
  }

  // Deduplicate (wrapping can produce duplicates at boundaries)
  return [...new Set(results)].sort();
}

/**
 * Returns the number of ISO weeks in a given year (52 or 53).
 */
export function weeksInYear(year: number): number {
  // A year has 53 weeks if Jan 1 or Dec 31 is a Thursday
  const jan1Day = new Date(Date.UTC(year, 0, 1)).getUTCDay() || 7;
  const dec31Day = new Date(Date.UTC(year, 11, 31)).getUTCDay() || 7;
  return jan1Day === 4 || dec31Day === 4 ? 53 : 52;
}

// ── Task derivation ───────────────────────────────────────────────────────────

export interface DeriveTasksOptions {
  schedules:     Schedule[];
  journalEntries: Pick<JournalEntry, "schedule_id" | "week" | "entry_type">[];
  lookbackWeeks: number;
  lookaheadWeeks: number;
  /** Reference date — defaults to today if not provided (injectable for tests) */
  now?: Date;
}

/**
 * Returns true when a schedule's time window overlaps with the lookback/lookahead
 * window [windowStartWeek, windowEndWeek] (both are raw week numbers within one year).
 *
 * Handles year-end wrapping (end_week < start_week) by treating those schedules
 * as always active (they span across the year boundary).
 */
function scheduleInWindow(
  schedule: Pick<Schedule, "start_week" | "end_week">,
  windowStartWeek: number,
  windowEndWeek: number,
): boolean {
  const { start_week: s, end_week: e } = schedule;
  if (e >= s) {
    // Normal range: active in [s, e]
    return s <= windowEndWeek && e >= windowStartWeek;
  } else {
    // Wrapping range (e.g. W50–W04): active outside [e+1, s-1]
    // → always overlaps unless window is entirely in [e+1, s-1]
    const inGap = windowStartWeek > e && windowEndWeek < s;
    return !inGap;
  }
}

/**
 * Derives the status of a schedule's time window relative to the current week.
 */
function windowStatus(
  schedule: Pick<Schedule, "start_week" | "end_week">,
  currentWeekNum: number,
): TaskStatus {
  const { start_week: s, end_week: e } = schedule;
  if (e >= s) {
    // Normal range
    if (e < currentWeekNum)  return "overdue";
    if (s > currentWeekNum)  return "upcoming";
    return "due";
  } else {
    // Wrapping range (e.g. W50–W04)
    const inRange = currentWeekNum >= s || currentWeekNum <= e;
    if (!inRange) return "upcoming"; // in the gap between e+1 and s-1
    if (e < currentWeekNum && currentWeekNum < s) return "upcoming"; // unreachable but safe
    return "due";
  }
}

/**
 * Schedule types that represent actionable care tasks shown to the user.
 * bloom and foliage are informational/decorative — never shown as tasks.
 */
const CARE_TYPES = new Set(["pruning", "fertilization", "growth", "misc"]);

/**
 * Derives one task per schedule for a plant.
 *
 * A schedule produces a task if:
 * 1. Its schedule_type is a care type (pruning/fertilization/growth/misc)
 * 2. Its time window overlaps with [now - lookbackWeeks, now + lookaheadWeeks]
 * 3. No JournalEntry of type "done" or "skipped" references that schedule_id
 *
 * task.week is the current ISO week (when the task was evaluated).
 */
export function deriveTasks(opts: DeriveTasksOptions): Task[] {
  const now            = opts.now ?? new Date();
  const currentWeekNum = isoWeekNumber(now);
  const currentWeekStr = toIsoWeek(now);

  const windowStartWeek = Math.max(1, currentWeekNum - opts.lookbackWeeks);
  const windowEndWeek   = Math.min(53, currentWeekNum + opts.lookaheadWeeks);

  // Resolved: any schedule_id with a done/skipped entry is suppressed entirely
  const resolvedScheduleIds = new Set<string>(
    opts.journalEntries
      .filter((e) => e.entry_type === "done" || e.entry_type === "skipped")
      .filter((e) => e.schedule_id != null)
      .map((e) => e.schedule_id!)
  );

  const tasks: Task[] = [];

  for (const schedule of opts.schedules) {
    if (!CARE_TYPES.has(schedule.schedule_type)) continue;  // bloom/foliage → skip
    if (resolvedScheduleIds.has(schedule.id)) continue;
    if (!scheduleInWindow(schedule, windowStartWeek, windowEndWeek)) continue;

    const status = windowStatus(schedule, currentWeekNum);
    tasks.push({ schedule, week: currentWeekStr, status });
  }

  // Sort: overdue first, then due, then upcoming
  const order: Record<TaskStatus, number> = { overdue: 0, due: 1, upcoming: 2 };
  return tasks.sort((a, b) => order[a.status] - order[b.status]);
}
