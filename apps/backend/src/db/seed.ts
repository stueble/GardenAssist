/**
 * Seed script — idempotent.
 *
 * Ensures the two singleton rows (garden, settings) exist.
 * Safe to run multiple times — uses INSERT OR IGNORE.
 *
 * Run with: pnpm --filter backend db:seed
 */

import { db } from "./index.js";
import { garden, settings } from "./schema.js";

async function seed() {
  // Garden singleton
  await db
    .insert(garden)
    .values({ id: "garden", plan_url: null, plan_name: null })
    .onConflictDoNothing();

  // Settings singleton with defaults
  await db
    .insert(settings)
    .values({
      id: "settings",
      location_city: null,
      location_zip: null,
      irrigation_zones: "[]",
      plant_categories: "[]",
      task_lookback_weeks: 2,
      task_lookahead_weeks: 4,
      attachment_size_limit_mb: 10,
      ai_provider: null,
      ai_model: null,
      ai_api_key: null,
    })
    .onConflictDoNothing();

  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
