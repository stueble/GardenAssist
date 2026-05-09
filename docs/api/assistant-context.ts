import type { Garden }      from "./garden";
import type { Plant }       from "./plant";
import type { ColorPreset } from "./color-preset";

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
};

export type AssistantContext = {
  view:           AssistantView;
  selectedPlant?: Plant;
  garden:         Garden;
  /** Optional — when present, enables the Settings cache block (Block #2). */
  settings?:      AssistantSettings;
};
