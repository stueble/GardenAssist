// ── PlantPosition ─────────────────────────────────────────────────────────────

/**
 * A single position of a plant on the garden plan.
 *
 * Coordinates are percentages (0–100) relative to the garden plan image
 * dimensions, so they remain valid when the plan image is replaced.
 *
 * A plant may have multiple positions (e.g. a hedge row, a group planting).
 * Positions are always returned as part of Plant.positions[] — never fetched
 * standalone.
 */
export type PlantPosition = {
  /** 0–100, relative to the garden plan image width. */
  x_percent: number;

  /** 0–100, relative to the garden plan image height. */
  y_percent: number;
};
