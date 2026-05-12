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
    Overdue: "overdue",
    Due: "due",
    Upcoming: "upcoming",
};
