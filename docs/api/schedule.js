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
    Bloom: "bloom",
    Growth: "growth",
    Foliage: "foliage",
    Pruning: "pruning",
    Fertilization: "fertilization",
    Misc: "misc",
};
