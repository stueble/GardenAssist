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
    Native: "native",
    Neophyte: "neophyte",
    InvasiveNeophyte: "invasive_neophyte",
};
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
    Annual: "annual",
    Biennial: "biennial",
    Perennial: "perennial",
};
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
    Sunny: "sunny",
    PartialShade: "partial_shade",
    Shady: "shady",
};
/**
 * Watering requirement of the plant.
 *
 * UI labels are not part of this spec — generate locale strings from
 * the enum values and their descriptions above.
 */
export const WaterDemand = {
    Low: "low",
    Medium: "medium",
    High: "high",
};
/**
 * Preferred soil type.
 *
 * UI labels are not part of this spec — generate locale strings from
 * the enum values and their descriptions above.
 */
export const SoilType = {
    Loamy: "loamy",
    Sandy: "sandy",
    HumusRich: "humus_rich",
    Calcareous: "calcareous",
    Acidic: "acidic",
};
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
    Good: "good",
    Watch: "watch",
    NeedsTreatment: "needs_treatment",
};
