import { ColorPreset } from "./color-preset";

// ── Enums (Language) ─────────────────────────────────────────────────────────

/**
 * UI display language.
 * - de: German (default)
 * - en: English
 *
 * Stored in Settings and applied on every page load.
 * Additional locales can be added without code changes.
 */
export const Language = {
  De: "de",
  En: "en",
} as const;
export type Language = typeof Language[keyof typeof Language];

// ── Enums ────────────────────────────────────────────────────────────────────

/**
 * The AI provider used for the assistant.
 * - anthropic: Anthropic Claude models
 * - openai: OpenAI GPT models
 * - openrouter: OpenRouter unified API (user specifies model ID manually)
 *
 * See ADR-001 for the provider-agnostic AI integration decision.
 */
export const AiProvider = {
  Anthropic:  "anthropic",
  OpenAi:     "openai",
  OpenRouter: "openrouter",
} as const;
export type AiProvider = typeof AiProvider[keyof typeof AiProvider];

// ── Settings ──────────────────────────────────────────────────────────────────

/**
 * App-wide configuration. Single record — always returned as a whole,
 * always updated as a whole.
 */
export type Settings = {

  // ── General ───────────────────────────────────────────────────────────────

  /**
   * UI display language. Default: "de".
   * Determines which locale file is loaded by i18next.
   */
  language: Language;

  // ── Location ───────────────────────────────────────────────────────────────

  /**
   * City name, e.g. "München".
   * Reserved for future weather and frost warning integration.
   */
  location_city: string | null;

  /**
   * Postal code, e.g. "80331".
   * Reserved for future weather and frost warning integration.
   */
  location_zip: string | null;

  // ── Garden Configuration ───────────────────────────────────────────────────

  /**
   * User-defined irrigation zone names, e.g. ["Zone A", "Terrasse"].
   * Referenced as free strings by Plant.watering_zone.
   * Deleting a zone does not update existing plants — no cascade.
   */
  irrigation_zones: string[];

  /**
   * User-defined plant category names, e.g. ["Rosen", "Gemüse", "Obstbäume"].
   * Referenced as free strings by Plant.category.
   * Deleting a category does not update existing plants — no cascade.
   */
  plant_categories: string[];

  /**
   * All user-defined color presets, grouped by schedule_type.
   * Used in the color picker popup of the Plant Edit Dialog.
   * Always returned and updated as a complete list.
   */
  color_presets: ColorPreset[];

  // ── Task Generation ────────────────────────────────────────────────────────

  /**
   * How many weeks into the past the task generator looks back.
   * Tasks older than this window are no longer shown as overdue.
   * Default: 2
   */
  task_lookback_weeks: number;

  /**
   * How many weeks into the future the task generator looks ahead.
   * Controls how far upcoming tasks are shown in the dashboard and plant views.
   * Default: 4
   */
  task_lookahead_weeks: number;

  // ── File Storage ───────────────────────────────────────────────────────────

  /**
   * Maximum allowed file size for uploads in megabytes.
   * Applies to all attachment types (images and PDFs).
   * Default: 10
   */
  attachment_size_limit_mb: number;

  // ── AI Assistant ───────────────────────────────────────────────────────────

  /** The AI provider to use for the assistant. null if not configured. */
  ai_provider: AiProvider | null;

  /**
   * The model identifier for the selected provider,
   * e.g. "claude-sonnet-4-6", "gpt-4o", or a custom OpenRouter model ID.
   * null if not configured.
   */
  ai_model: string | null;

  /**
   * The user's API key for the selected provider.
   * Stored locally only — never transmitted to any backend other than the
   * configured AI provider. Masked in all UI representations.
   * null if not configured.
   */
  ai_api_key: string | null;
};
