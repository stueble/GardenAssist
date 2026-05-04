/**
 * Task derivation logic (ADR-005).
 *
 * Tasks are never stored — they are computed by expanding each Schedule into
 * weekly occurrences within a time window and subtracting JournalEntry records
 * of type "done" or "skipped" that reference the same schedule_id and week.
 *
 * Week identifiers follow ISO 8601: "YYYY-Www" (e.g. "2026-W12").
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
 * Derives the open task list for a plant's schedules.
 *
 * For each (schedule, week) pair in the time window, a task is generated
 * unless a matching JournalEntry of type "done" or "skipped" exists.
 *
 * Status:
 * - overdue:  week is before current week
 * - due:      week is the current week
 * - upcoming: week is after current week
 */
export function deriveTasks(opts: DeriveTasksOptions): Task[] {
  const now = opts.now ?? new Date();
  const currentWeek = toIsoWeek(now);

  // Compute window boundaries
  const windowStartDate = new Date(now);
  windowStartDate.setUTCDate(now.getUTCDate() - opts.lookbackWeeks * 7);
  const windowEndDate = new Date(now);
  windowEndDate.setUTCDate(now.getUTCDate() + opts.lookaheadWeeks * 7);

  const windowStart = toIsoWeek(windowStartDate);
  const windowEnd   = toIsoWeek(windowEndDate);

  // Build a set of resolved (schedule_id, week) pairs
  const resolved = new Set<string>(
    opts.journalEntries
      .filter((e) => e.entry_type === "done" || e.entry_type === "skipped")
      .filter((e) => e.schedule_id != null && e.week != null)
      .map((e) => `${e.schedule_id}::${e.week}`)
  );

  const tasks: Task[] = [];

  for (const schedule of opts.schedules) {
    const weeks = expandScheduleWeeks(schedule, windowStart, windowEnd);

    for (const week of weeks) {
      const key = `${schedule.id}::${week}`;
      if (resolved.has(key)) continue;

      let status: TaskStatus;
      if (week < currentWeek) {
        status = "overdue";
      } else if (week === currentWeek) {
        status = "due";
      } else {
        status = "upcoming";
      }

      tasks.push({ schedule, week, status });
    }
  }

  // Sort: overdue first (oldest first), then due, then upcoming
  return tasks.sort((a, b) => {
    const order = { overdue: 0, due: 1, upcoming: 2 };
    const statusDiff = order[a.status] - order[b.status];
    if (statusDiff !== 0) return statusDiff;
    return a.week.localeCompare(b.week);
  });
}
