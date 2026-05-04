import { Schedule } from "./schedule";

// ── Enums ────────────────────────────────────────────────────────────────────

/**
 * The status of a derived task relative to the current date.
 * - overdue: the schedule window has passed and no journal entry exists
 * - due: the schedule window is active this week
 * - upcoming: the schedule window starts within the lookahead window
 *
 * UI labels are not part of this spec — generate locale strings from
 * the enum values and their descriptions above.
 */
export const TaskStatus = {
  Overdue:  "overdue",
  Due:      "due",
  Upcoming: "upcoming",
} as const;
export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

// ── Task ─────────────────────────────────────────────────────────────────────

/**
 * A derived, read-only care task for a plant.
 *
 * Tasks are never stored — they are computed on every request by expanding
 * the plant's schedules into weekly occurrences and subtracting any
 * JournalEntry records of type "done" or "skipped" that cover the same
 * schedule and week (see ADR-005).
 *
 * The time window for task generation is controlled by
 * Settings.task_lookback_weeks (how far into the past overdue tasks are shown)
 * and Settings.task_lookahead_weeks (how far into the future upcoming tasks
 * are shown).
 *
 * Tasks cannot be created, updated, or deleted via the API.
 * To resolve a task, create a JournalEntry of type "done" or "skipped"
 * referencing the task's schedule.id and week.
 */
export type Task = {
  /**
   * The schedule this task was derived from.
   * Used to display the task type, label, and color in the UI, and to
   * create the correct JournalEntry when the task is resolved.
   */
  schedule: Schedule;

  /**
   * ISO 8601 week identifier this task instance belongs to, e.g. "2026-W12".
   * Used together with schedule.id to uniquely identify a task instance
   * and to match it against existing JournalEntry records.
   */
  week: string;

  /** Status of this task relative to the current date. */
  status: TaskStatus;
};
