import type { Garden }          from "./garden";
import type { Plant }           from "./plant";
import type { ColorPreset }     from "./color-preset";
import type { GardenerProfile } from "./settings";

/**
 * Context passed from each view to AiPanel so the assistant can build
 * a relevant, situation-aware system prompt.
 *
 * - view:          which view the user is currently on
 * - selectedPlant: the plant the user has open/selected (optional)
 * - garden:        full garden data — serialized and stripped before sending
 * - settings:      subset of app settings relevant to the assistant (no API keys)
 */
export type AssistantView =
  | "dashboard"
  | "plants"
  | "calendar"
  | "journal"
  | "settings";

/**
 * Subset of Settings passed to the AI assistant.
 * Excludes sensitive / irrelevant fields: ai_provider, ai_model, ai_api_key,
 * attachment_size_limit_mb, task_lookback_weeks, task_lookahead_weeks.
 */
export type AssistantSettings = {
  location_city:    string | null;
  location_zip:     string | null;
  irrigation_zones: string[];
  plant_categories: string[];
  color_presets:    ColorPreset[];
  /** null falls back to "engaged" (standard seasonal care). */
  gardener_profile: GardenerProfile | null;
};

/**
 * One schedule that has been suggested by the AI in the currently open
 * plant edit dialog but not yet saved to the database.
 *
 * isTemporaryId: true when action === "add" — the id is a frontend-local
 * crypto.randomUUID(). It is stable for the lifetime of the open dialog
 * and can be used by the AI in subsequent remove/update calls within the
 * same session. After the user clicks Save, the server assigns real IDs
 * and the garden context is refreshed.
 */
export type PendingSchedule = {
  action:         "add" | "remove" | "update";
  id:             string;
  isTemporaryId:  boolean;
  schedule_type?: string;
  start_week?:    number;
  end_week?:      number;
  label?:         string | null;
  color?:         string | null;
};

/**
 * Represents the AI-suggested changes currently staged in the open
 * PlantEditDialog that have not yet been confirmed by the user (Save).
 *
 * Included in AssistantContext so Block 5 of the system prompt can inform
 * the model about what it has already proposed, preventing duplicate
 * suggestions on follow-up messages.
 */
export type PendingPlantEdit = {
  /** The plant being edited, or null for a new plant. */
  plantId:      string | null;
  /** Scalar fields the AI has pre-filled, keyed by field name. */
  scalarFields: Record<string, string>;
  /** Schedule operations the AI has staged. */
  schedules:    PendingSchedule[];
};

export type AssistantContext = {
  view:           AssistantView;
  selectedPlant?: Plant;
  garden:         Garden;
  /** Optional — when present, enables the Settings cache block (Block #2). */
  settings?:      AssistantSettings;
  /** Optional — AI-suggested changes staged in the open PlantEditDialog. */
  pendingPlantEdit?: PendingPlantEdit;
};
