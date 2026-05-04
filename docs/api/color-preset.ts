import { ScheduleType } from "./schedule";

// ── ColorPreset ───────────────────────────────────────────────────────────────

/**
 * A named, user-editable color preset for a given schedule type.
 *
 * Color presets are shown in the color picker popup of the Plant Edit Dialog.
 * All schedule types have presets — some ship with sensible defaults
 * (e.g. dark green for growth, blue for fertilization) but all are fully
 * editable and deletable by the user in Settings → Farb-Presets.
 *
 * Changing or deleting a preset does not retroactively update existing
 * Schedule records — colors are copied to the schedule at creation time.
 *
 * Presets are managed as part of Settings.color_presets — always returned
 * and updated as a complete list, never individually.
 */
export type ColorPreset = {
  /** The schedule type this preset belongs to. */
  schedule_type: ScheduleType;

  /** Display name of the preset, e.g. "Dunkelrot", "Frühjahrsgrün". */
  name: string;

  /** Hex color string, e.g. "#8B0000". */
  color: string;
};
