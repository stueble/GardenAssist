import { JournalEntry } from "./journal-entry";
import { Task } from "./task";
import { Attachment } from "./attachment";
import { PlantPosition } from "./plant-position";
import { Schedule } from "./schedule";

// ── Enums ────────────────────────────────────────────────────────────────────

/**
 * The plant's origin classification.
 * - native: indigenous to the region
 * - neophyte: introduced, non-invasive
 * - invasive_neophyte: introduced and ecologically problematic
 *
 * UI labels are not part of this spec — generate locale strings from
 * the enum values and their descriptions above.
 */
export const OriginType = {
  Native:           "native",
  Neophyte:         "neophyte",
  InvasiveNeophyte: "invasive_neophyte",
} as const;
export type OriginType = typeof OriginType[keyof typeof OriginType];

/**
 * Plant lifecycle duration.
 * - annual: completes its life cycle within one year
 * - biennial: two-year life cycle
 * - perennial: lives more than two years, dies back in winter
 * - evergreen: lives more than two years, keeps foliage year-round
 *
 * UI labels are not part of this spec — generate locale strings from
 * the enum values and their descriptions above.
 */
export const Lifecycle = {
  Annual:    "annual",
  Biennial:  "biennial",
  Perennial: "perennial",
} as const;
export type Lifecycle = typeof Lifecycle[keyof typeof Lifecycle];

/**
 * Sunlight requirement of the plant.
 * - sunny: at least 6 hours of direct sun per day
 * - partial_shade: 3–6 hours of direct sun per day
 * - shady: less than 3 hours of direct sun per day
 *
 * UI labels are not part of this spec — generate locale strings from
 * the enum values and their descriptions above.
 */
export const SunDemand = {
  Sunny:        "sunny",
  PartialShade: "partial_shade",
  Shady:        "shady",
} as const;
export type SunDemand = typeof SunDemand[keyof typeof SunDemand];

/**
 * Watering requirement of the plant.
 *
 * UI labels are not part of this spec — generate locale strings from
 * the enum values and their descriptions above.
 */
export const WaterDemand = {
  Low:    "low",
  Medium: "medium",
  High:   "high",
} as const;
export type WaterDemand = typeof WaterDemand[keyof typeof WaterDemand];

/**
 * Preferred soil type.
 *
 * UI labels are not part of this spec — generate locale strings from
 * the enum values and their descriptions above.
 */
export const SoilType = {
  Loamy:      "loamy",
  Sandy:      "sandy",
  HumusRich:  "humus_rich",
  Calcareous: "calcareous",
  Acidic:     "acidic",
} as const;
export type SoilType = typeof SoilType[keyof typeof SoilType];

/**
 * Current health status of the plant. Set manually by the user.
 * - good: no issues
 * - watch: showing signs that warrant monitoring
 * - needs_treatment: active problem requiring intervention
 *
 * UI labels are not part of this spec — generate locale strings from
 * the enum values and their descriptions above.
 */
export const HealthStatus = {
  Good:           "good",
  Watch:          "watch",
  NeedsTreatment: "needs_treatment",
} as const;
export type HealthStatus = typeof HealthStatus[keyof typeof HealthStatus];

// ── Plant ────────────────────────────────────────────────────────────────────

/**
 * A plant in the garden.
 *
 * Returned as a fully assembled object — positions, images, and schedules
 * are always included. When creating or updating a plant, all nested arrays
 * are replaced in full (patch-replace semantics, not partial update).
 */
export type Plant = {
  id: string;

  // ── Identity ──────────────────────────────────────────────────────────────

  /** Common name, e.g. "Rote Rose". Required. */
  name_common: string;

  /** Latin / botanical name. Optional. */
  name_botanical: string | null;

  /**
   * An SVG string representing the plant visually.
   * Used as a pin on the garden plan, as a thumbnail in the Plants Overview,
   * and in all list and detail views.
   *
   * The AI assistant selects an appropriate SVG shape from the app's icon
   * library based on the plant's name and care data. The color is not part
   * of this field — it is derived at render time from the plant's bloom or
   * foliage schedules.
   *
   * Can be replaced by the user via the icon picker in the Plant Edit Dialog.
   */
  icon: string | null;

  // ── Classification ────────────────────────────────────────────────────────

  origin_type: OriginType | null;

  /**
   * User-defined category, e.g. "Rosen", "Gemüse", "Bodendecker".
   * Must match one of the values in Settings.plant_categories.
   * If the referenced category is deleted from settings, this field becomes
   * a dangling string — no cascade delete.
   */
  category: string | null;

  lifecycle: Lifecycle | null;

  // ── Description ───────────────────────────────────────────────────────────

  /** Free-form description of the plant. */
  description: string | null;

  /**
   * Free-form care notes, e.g. pruning tips, known sensitivities.
   * Displayed on a yellow background in the detail panel (read-only).
   * Editable in the Plant Edit Dialog.
   */
  care_notes: string | null;

  // ── Care Requirements ─────────────────────────────────────────────────────

  sun_demand: SunDemand | null;

  water_demand: WaterDemand | null;

  soil_type: SoilType | null;

  /**
   * Minimum frost tolerance in degrees Celsius.
   * e.g. -15 means the plant survives down to -15°C.
   */
  frost_tolerance_min_c: number | null;

  /**
   * Whether the plant needs to be moved indoors or given frost protection
   * during winter. Used to generate a reminder task before the first frost.
   * Default: false
   */
  temperature_protected: boolean;

  // ── State ─────────────────────────────────────────────────────────────────

  health_status: HealthStatus | null;

  /**
   * Free-text location in the garden, e.g. "Westbeet", "Südterrasse".
   * Used in the Plants Overview table and the detail panel.
   */
  location: string | null;

  /**
   * Irrigation zone name. Must match one of the values in Settings.irrigation_zones.
   * If the referenced zone is deleted from settings, this field becomes a dangling
   * string — no cascade delete.
   */
  watering_zone: string | null;

  // ── Purchase ──────────────────────────────────────────────────────────────

  /** Date the plant was purchased or planted. ISO 8601 date string, e.g. "2024-03-15". */
  purchase_date: string | null;

  /** Purchase price in €. */
  purchase_price: number | null;

  // ── Nested Objects ────────────────────────────────────────────────────────

  /**
   * All positions of this plant on the garden plan.
   * A plant may appear in multiple locations (e.g. a hedge row, a group planting).
   */
  positions: PlantPosition[];

  /**
   * All attachments of this plant, sorted by sort_order ascending.
   * The first image attachment (lowest sort_order) is used as the thumbnail
   * in list and overview views. Order is controlled by the user via drag-and-drop
   * in the edit dialog and persisted to the database.
   */
  attachments: Attachment[];

  /**
   * All journal entries for this plant, sorted by date descending (newest first).
   * Includes entries of all types: manual, done, and skipped.
   * Filtering by type is left to the UI.
   * Pagination is not supported in v1 — the full list is always returned.
   */
  journal_entries: JournalEntry[];

  /**
   * All care and growth schedules for this plant, ordered by schedule_type
   * and then start_week.
   * Tasks are never stored separately — they are derived at runtime from
   * these schedules combined with JournalEntry records (see ADR-005).
   */
  schedules: Schedule[];

  /**
   * Derived list of open, overdue, and upcoming tasks for this plant.
   * Never stored — computed on every request by expanding the plant's schedules
   * into individual weekly occurrences and subtracting any JournalEntry records
   * of type "done" or "skipped" that cover the same schedule and week.
   *
   * The time window is controlled by Settings.task_lookback_weeks and
   * Settings.task_lookahead_weeks.
   *
   * Read-only — tasks cannot be created, updated, or deleted via the API.
   */
  tasks: Task[];

  // ── Metadata ──────────────────────────────────────────────────────────────

  /** ISO 8601 datetime string. Set on creation, never updated. */
  created_at: string;

  /** ISO 8601 datetime string. Updated on every write. */
  updated_at: string;
};
