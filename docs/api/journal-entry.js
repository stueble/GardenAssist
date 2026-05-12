// ── Enums ────────────────────────────────────────────────────────────────────
/**
 * The type of a journal entry.
 * - manual: created freely by the user or confirmed from an AI suggestion
 * - done: automatically created when the user marks a task as completed
 * - skipped: automatically created when the user marks a task as skipped;
 *   prevents the task from reappearing for the same week
 *
 * UI labels are not part of this spec — generate locale strings from
 * the enum values and their descriptions above.
 */
export const JournalEntryType = {
    Manual: "manual",
    Observation: "observation",
    Problem: "problem",
    Done: "done",
    Skipped: "skipped",
};
