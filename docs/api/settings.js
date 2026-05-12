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
};
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
    Anthropic: "anthropic",
    OpenAi: "openai",
    OpenRouter: "openrouter",
};
/**
 * Gardener experience / time budget profile.
 * Injected into the AI system prompt (Block 1) so the assistant calibrates
 * care recommendation complexity to the user's reality.
 * - hobbyist: ~1h/week, minimal interventions
 * - engaged:  2–4h/week, standard seasonal care (default)
 * - expert:   5h+/week, professional-grade routines
 */
export const GardenerProfile = {
    Hobbyist: "hobbyist",
    Engaged: "engaged",
    Expert: "expert",
};
