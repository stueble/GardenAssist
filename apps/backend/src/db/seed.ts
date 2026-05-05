/**
 * Seed script — idempotent.
 *
 * Ensures the two singleton rows (garden, settings) exist and that
 * plant_categories, irrigation_zones, and color_presets are populated
 * with the default values from the UI mockup.
 *
 * Safe to run multiple times:
 * - garden and settings rows use INSERT OR IGNORE (no overwrite if they exist)
 * - color_presets are only inserted when the table is empty
 * - plant_categories and irrigation_zones are only set when the settings row
 *   is freshly created (INSERT OR IGNORE means existing data is preserved)
 *
 * Run with: pnpm --filter backend db:seed
 */

import { db } from "./index.js";
import { garden, settings, colorPresets } from "./schema.js";

// ── Default values from the UI mockup ────────────────────────────────────────

const DEFAULT_IRRIGATION_ZONES = JSON.stringify([
  "Beet West",
  "Beet Ost",
  "Rasen",
  "Terrasse",
  "Einfahrt",
]);

const DEFAULT_PLANT_CATEGORIES = JSON.stringify([
  "Strauch",
  "Baum",
  "Staude",
  "Blume",
  "Nadelbaum",
  "Obstbaum",
]);

const DEFAULT_COLOR_PRESETS: Array<{
  schedule_type: string;
  name:          string;
  color:         string;
}> = [
  // Blütezeiten (bloom)
  { schedule_type: "bloom", name: "Dunkelrot",   color: "#c0392b" },
  { schedule_type: "bloom", name: "Rot",         color: "#e74c3c" },
  { schedule_type: "bloom", name: "Korallrot",   color: "#ff6b9d" },
  { schedule_type: "bloom", name: "Pink",        color: "#e91e8c" },
  { schedule_type: "bloom", name: "Lila",        color: "#9b59b6" },
  { schedule_type: "bloom", name: "Orange",      color: "#f39c12" },
  { schedule_type: "bloom", name: "Zartrosa",    color: "#f8c8d0" },
  { schedule_type: "bloom", name: "Weiß",        color: "#ffffff" },
  // Wachstum (growth)
  { schedule_type: "growth", name: "Hellgrün",   color: "#a8d5a2" },
  { schedule_type: "growth", name: "Mittelgrün", color: "#4a7c4a" },
  { schedule_type: "growth", name: "Dunkelgrün", color: "#2e7d32" },
  // Blätter (foliage)
  { schedule_type: "foliage", name: "Frühjahrsgrün", color: "#a8d5a2" },
  { schedule_type: "foliage", name: "Dunkelgrün",    color: "#1b5e20" },
  { schedule_type: "foliage", name: "Immergrün",     color: "#2d5a1b" },
  { schedule_type: "foliage", name: "Herbstrot",     color: "#c0392b" },
  { schedule_type: "foliage", name: "Herbstorange",  color: "#c0793a" },
  { schedule_type: "foliage", name: "Herbstgold",    color: "#f0c040" },
  { schedule_type: "foliage", name: "Herbstbraun",   color: "#8b7355" },
  // Schnitt (pruning)
  { schedule_type: "pruning", name: "Hellgrün",  color: "#27ae60" },
  { schedule_type: "pruning", name: "Grün",      color: "#2ecc71" },
  // Düngung (fertilization)
  { schedule_type: "fertilization", name: "Blau",      color: "#2980b9" },
  { schedule_type: "fertilization", name: "Hellblau",  color: "#3498db" },
  // Sonstiges (misc)
  { schedule_type: "misc", name: "Orange", color: "#e67e22" },
  { schedule_type: "misc", name: "Grau",   color: "#7f8c8d" },
  { schedule_type: "misc", name: "Blau",   color: "#3498db" },
  { schedule_type: "misc", name: "Gelb",   color: "#f1c40f" },
];

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  // Garden singleton
  await db
    .insert(garden)
    .values({ id: "garden", plan_url: null, plan_name: null })
    .onConflictDoNothing();

  // Settings singleton — only inserted when not yet present.
  // Existing user data is never overwritten.
  await db
    .insert(settings)
    .values({
      id:                       "settings",
      language:                 "de",
      location_city:            null,
      location_zip:             null,
      irrigation_zones:         DEFAULT_IRRIGATION_ZONES,
      plant_categories:         DEFAULT_PLANT_CATEGORIES,
      task_lookback_weeks:      2,
      task_lookahead_weeks:     4,
      attachment_size_limit_mb: 10,
      ai_provider:              null,
      ai_model:                 null,
      ai_api_key:               null,
    })
    .onConflictDoNothing();

  // Color presets — only insert when table is empty.
  // This preserves any presets the user has already configured.
  const existingPresets = db.select().from(colorPresets).all();
  if (existingPresets.length === 0) {
    DEFAULT_COLOR_PRESETS.forEach((preset, index) => {
      db.insert(colorPresets).values({
        id:            crypto.randomUUID(),
        schedule_type: preset.schedule_type,
        name:          preset.name,
        color:         preset.color,
        sort_order:    index,
      }).run();
    });
    console.log(`Inserted ${DEFAULT_COLOR_PRESETS.length} default color presets.`);
  } else {
    console.log(`Color presets already exist (${existingPresets.length} rows) — skipped.`);
  }

  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
