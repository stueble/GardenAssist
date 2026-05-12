// ── Enums ────────────────────────────────────────────────────────────────────

/**
 * The type of a journal entry.
 * - manual: created freely by the user or confirmed from an AI suggestion
 * - done: automatically created when the user marks a task as completed
 * - skipped: automatically created when the user marks a task as skipped;
 *   prevents the task from reappearing for the same week
 * - irrigation: records a manual watering event for a specific irrigation zone.
 *   title holds the zone name (must match one of Settings.irrigation_zones).
 *   notes holds the applied water amount as a numeric string in millimetres,
 *   e.g. "15" for 15 mm. Used by the FAO-56 water balance calculation (TASK-073).
 *
 * UI labels are not part of this spec — generate locale strings from
 * the enum values and their descriptions above.
 */
export const JournalEntryType = {
  Manual:      "manual",
  Observation: "observation",
  Problem:     "problem",
  Done:        "done",
  Skipped:     "skipped",
  Irrigation:  "irrigation",
} as const;
export type JournalEntryType = typeof JournalEntryType[keyof typeof JournalEntryType];

// ── JournalEntry ──────────────────────────────────────────────────────────────

/**
 * A persistent record of a care activity or observation.
 *
 * Journal entries are either:
 * - created manually by the user (or confirmed from an AI suggestion)
 * - created automatically when a task is marked as done or skipped
 *
 * If plant_id is set, the entry belongs to that plant and its attachment_ids
 * reference items from Plant.attachments[]. If plant_id is null, the entry
 * belongs to the garden as a whole and attachment_ids reference items from
 * Garden.attachments[].
 *
 * Entries are editable after saving. Deleting a journal entry does not delete
 * the referenced attachments.
 */
export type JournalEntry = {
  id: string;

  /**
   * The plant this entry is associated with.
   * null for general garden observations not tied to a specific plant.
   */
  plant_id: string | null;

  /**
   * The schedule that triggered this entry, if any.
   * Set automatically when a task is marked as done or skipped.
   * null for manual entries.
   */
  schedule_id: string | null;

  /**
   * The week this entry covers, as an ISO 8601 week identifier, e.g. "2026-W12".
   * Set automatically when a task is resolved; manually set by the user
   * for free-form entries.
   */
  week: string | null;

  entry_type: JournalEntryType;

  /** ISO 8601 date string of the activity, e.g. "2026-03-21". */
  date: string;

  /** Short summary of the entry, e.g. "Rückschnitt nach Blüte". */
  title: string | null;

  /** Free-form notes, observations, or details. */
  notes: string | null;

  /**
   * IDs of attachments associated with this entry.
   * References items from Plant.attachments[] if plant_id is set,
   * or from Garden.attachments[] if plant_id is null.
   */
  attachment_ids: string[];

  /** ISO 8601 datetime string. Set on creation, never updated. */
  created_at: string;

  /** ISO 8601 datetime string. Updated on every write. */
  updated_at: string;
};
