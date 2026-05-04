// ── Enums ────────────────────────────────────────────────────────────────────

/**
 * The type of a schedule interval.
 * - bloom: flowering period; color represents the bloom color
 * - growth: active growth period
 * - foliage: leaf color phase (no entry = no foliage, e.g. deciduous in winter)
 * - pruning: recommended pruning window
 * - fertilization: recommended fertilization window
 * - misc: any other recurring care activity (e.g. harvest, sowing, observation)
 *
 * bloom, foliage, and misc have user-configurable colors via ColorPreset.
 * growth, pruning, and fertilization also use ColorPresets but ship with
 * sensible defaults that the user can override in Settings.
 *
 * UI labels are not part of this spec — generate locale strings from
 * the enum values and their descriptions above.
 */
export const ScheduleType = {
  Bloom:         "bloom",
  Growth:        "growth",
  Foliage:       "foliage",
  Pruning:       "pruning",
  Fertilization: "fertilization",
  Misc:          "misc",
} as const;
export type ScheduleType = typeof ScheduleType[keyof typeof ScheduleType];

// ── Schedule ─────────────────────────────────────────────────────────────────

/**
 * A recurring care or growth interval for a plant.
 *
 * Week numbers follow ISO 8601 (1–52). If start_week > end_week, the interval
 * wraps across the calendar year (e.g. start_week 48, end_week 6 means
 * late November through early February).
 *
 * A plant may have multiple schedules of the same type (e.g. two pruning
 * windows per year, or several bloom periods in different colors).
 */
export type Schedule = {
  id: string;

  /** The type of care or growth this interval represents. */
  schedule_type: ScheduleType;

  /**
   * Start of the interval as an ISO 8601 week number (1–52).
   * If start_week > end_week, the interval wraps across the calendar year.
   */
  start_week: number;

  /**
   * End of the interval as an ISO 8601 week number (1–52).
   * If end_week < start_week, the interval wraps across the calendar year.
   */
  end_week: number;

  /**
   * Hex color string for this interval, e.g. "#8B0000".
   * Sourced from the user's ColorPreset list for the corresponding schedule_type.
   * Stored independently — changing a ColorPreset does not retroactively
   * update existing schedules.
   */
  color: string | null;

  /**
   * Short label for this interval.
   * For bloom: typically the color name, e.g. "Dunkelrot" (auto-filled from
   * the selected ColorPreset, editable by the user).
   * For misc: describes the activity, e.g. "Ernte", "Aussaat".
   * Optional for all other types.
   */
  label: string | null;

  /** Optional free-form notes, e.g. care tips specific to this interval. */
  notes: string | null;

  /** ISO 8601 datetime string. Set on creation, never updated. */
  created_at: string;

  /** ISO 8601 datetime string. Updated on every write. */
  updated_at: string;
};
