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

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { db as defaultDb } from "./index.js";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "./schema.js";
import { garden, settings, colorPresets, plants, schedules } from "./schema.js";

// ── Default values — English keys, translated in the frontend via i18n ────────
//
// All string values here are the canonical i18n keys stored in the database.
// The frontend translates them on display using t("defaults.<section>.<key>",
// { defaultValue: key, ns: "settings" }), so a user always sees their chosen
// language as long as the value has not been customised.
//
// These constants are exported so that delete.service.ts (installDefaults)
// can reuse them without duplicating the data.

export const DEFAULT_IRRIGATION_ZONES = JSON.stringify([
  "West Bed",
  "East Bed",
  "Lawn",
  "Terrace",
  "Driveway",
]);

export const DEFAULT_PLANT_CATEGORIES = JSON.stringify([
  "Shrub",
  "Tree",
  "Perennial",
  "Flower",
  "Conifer",
  "Fruit Tree",
]);

export type DefaultColorPreset = {
  schedule_type: string;
  name:          string;
  color:         string;
};

export const DEFAULT_COLOR_PRESETS: DefaultColorPreset[] = [
  // Bloom
  { schedule_type: "bloom",         name: "Dark Red",          color: "#c0392b" },
  { schedule_type: "bloom",         name: "Red",               color: "#e74c3c" },
  { schedule_type: "bloom",         name: "Coral Red",         color: "#ff6b9d" },
  { schedule_type: "bloom",         name: "Pink",              color: "#e91e8c" },
  { schedule_type: "bloom",         name: "Purple",            color: "#9b59b6" },
  { schedule_type: "bloom",         name: "Orange",            color: "#f39c12" },
  { schedule_type: "bloom",         name: "Pale Pink",         color: "#f8c8d0" },
  { schedule_type: "bloom",         name: "White",             color: "#ffffff" },
  // Growth
  { schedule_type: "growth",        name: "Light Green",       color: "#a8d5a2" },
  { schedule_type: "growth",        name: "Medium Green",      color: "#4a7c4a" },
  { schedule_type: "growth",        name: "Dark Green",        color: "#2e7d32" },
  // Foliage
  { schedule_type: "foliage",       name: "Spring Green",      color: "#a8d5a2" },
  { schedule_type: "foliage",       name: "Forest Green",      color: "#1b5e20" },
  { schedule_type: "foliage",       name: "Evergreen",         color: "#2d5a1b" },
  { schedule_type: "foliage",       name: "Autumn Red",        color: "#c0392b" },
  { schedule_type: "foliage",       name: "Autumn Orange",     color: "#c0793a" },
  { schedule_type: "foliage",       name: "Autumn Gold",       color: "#f0c040" },
  { schedule_type: "foliage",       name: "Autumn Brown",      color: "#8b7355" },
  // Pruning
  { schedule_type: "pruning",       name: "Spring Pruning",    color: "#27ae60" },
  { schedule_type: "pruning",       name: "Autumn Pruning",    color: "#2ecc71" },
  // Fertilization
  { schedule_type: "fertilization", name: "Fertilize",         color: "#3498db" },
  { schedule_type: "fertilization", name: "Autumn Fertilizer", color: "#2980b9" },
  // Misc
  { schedule_type: "misc",          name: "Aerate",            color: "#e67e22" },
  { schedule_type: "misc",          name: "Scarify",           color: "#7f8c8d" },
  { schedule_type: "misc",          name: "Harvest",           color: "#3498db" },
  { schedule_type: "misc",          name: "Sow",               color: "#f1c40f" },
];

// Path to the bundled example garden plan image (relative to this file at build time).
// In Docker the file is copied to /app/examples/plan/example_garden.png.
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const EXAMPLE_PLAN_SRC = path.resolve(__dirname, "../../../../examples/plan/example_garden.png");

// ── Default plants ────────────────────────────────────────────────────────────

const NOW = new Date().toISOString();

const DEFAULT_PLANTS: Array<{
  id: string;
  name_common: string;
  name_botanical: string | null;
  icon: string;
  category: string;
  lifecycle: string;
  location: string;
  watering_zone: string;
  frost_tolerance_min_c: number | null;
  temperature_protected: boolean;
  description: string | null;
  care_notes: string | null;
  purchase_date: string | null;
  schedules: Array<{
    id: string;
    schedule_type: string;
    start_week: number;
    end_week: number;
    color: string | null;
    label: string | null;
  }>;
}> = [
  {
    id:                    "plant-seed-001",
    name_common:           "Red Rose",
    name_botanical:        "Rosa",
    icon:                  "🌹",
    category:              "Shrub",
    lifecycle:             "perennial",
    location:              "West Bed",
    watering_zone:         "West Bed",
    frost_tolerance_min_c: -15,
    temperature_protected: false,
    purchase_date:         "2022-03-15",
    description:           "Classic garden rose with lush blooms from May to September. Prefers sunny, sheltered spots with nutrient-rich, slightly acidic soil. Hardy and long-lived with proper care.",
    care_notes:            "Deadhead after flowering. No nitrogen after August. Winter protection recommended from November.",
    schedules: [
      { id:"sched-001-bloom",  schedule_type:"bloom",         start_week:18, end_week:38, color:"#e74c3c", label:"Red" },
      { id:"sched-001-prune1", schedule_type:"pruning",       start_week:9,  end_week:11, color:"#27ae60", label:"Spring Pruning" },
      { id:"sched-001-prune2", schedule_type:"pruning",       start_week:32, end_week:33, color:"#2ecc71", label:"Autumn Pruning" },
      { id:"sched-001-fert",   schedule_type:"fertilization", start_week:15, end_week:20, color:"#3498db", label:"Fertilize" },
    ],
  },
  {
    id:                    "plant-seed-002",
    name_common:           "Rhododendron",
    name_botanical:        "Rhododendron hyb.",
    icon:                  "💐",
    category:              "Shrub",
    lifecycle:             "perennial",
    location:              "Terrace",
    watering_zone:         "Terrace",
    frost_tolerance_min_c: -10,
    temperature_protected: false,
    purchase_date:         "2020-04-10",
    description:           "Evergreen ornamental shrub with spectacular spring blooms in purple and pink. Requires acidic, humus-rich soil without lime. Ideal as a specimen plant or in groups in partial shade.",
    care_notes:            "Lime-free substrate is essential. Use rhododendron fertilizer. No pruning required.",
    schedules: [
      { id:"sched-002-bloom", schedule_type:"bloom",         start_week:14, end_week:22, color:"#9b59b6", label:"Purple" },
      { id:"sched-002-fert",  schedule_type:"fertilization", start_week:14, end_week:20, color:"#3498db", label:"Fertilize" },
    ],
  },
  {
    id:                    "plant-seed-003",
    name_common:           "Magnolia",
    name_botanical:        "Magnolia grandiflora",
    icon:                  "🌸",
    category:              "Tree",
    lifecycle:             "perennial",
    location:              "Northwest",
    watering_zone:         "Lawn",
    frost_tolerance_min_c: -20,
    temperature_protected: false,
    purchase_date:         "2016-05-01",
    description:           "Large-leafed evergreen tree with impressive white blooms in April and May. Grows slowly but becomes a magnificent specimen over the years. Lime-free, moist soil is important.",
    care_notes:            "No pruning required. Spring bloomer — do not fertilize before last frost.",
    schedules: [
      { id:"sched-003-bloom",   schedule_type:"bloom",   start_week:14, end_week:19, color:"#ffffff", label:"White" },
      { id:"sched-003-foliage", schedule_type:"foliage", start_week:1,  end_week:52, color:"#2d5a1b", label:"Evergreen" },
    ],
  },
  {
    id:                    "plant-seed-004",
    name_common:           "Apple Tree",
    name_botanical:        "Malus domestica",
    icon:                  "🍎",
    category:              "Fruit Tree",
    lifecycle:             "perennial",
    location:              "Centre",
    watering_zone:         "Lawn",
    frost_tolerance_min_c: -25,
    temperature_protected: false,
    purchase_date:         "2012-03-20",
    description:           "Reliable Elstar variety with sweet-tart fruits, ready to harvest from September. The tree is robust, self-fertile and tolerates frost to -25°C. Regular pruning promotes fruit quality and vitality.",
    care_notes:            "Prune during dormancy. Thin fruits in June for best results. Variety: Elstar.",
    schedules: [
      { id:"sched-004-bloom",  schedule_type:"bloom",         start_week:16, end_week:19, color:"#f8c8d0", label:"Pale Pink" },
      { id:"sched-004-prune",  schedule_type:"pruning",       start_week:6,  end_week:9,  color:"#2ecc71", label:"Autumn Pruning" },
      { id:"sched-004-fert",   schedule_type:"fertilization", start_week:13, end_week:16, color:"#3498db", label:"Fertilize" },
      { id:"sched-004-misc",   schedule_type:"misc",          start_week:36, end_week:41, color:"#3498db", label:"Harvest" },
    ],
  },
  {
    id:                    "plant-seed-005",
    name_common:           "Arborvitae",
    name_botanical:        "Thuja occidentalis",
    icon:                  "🌲",
    category:              "Conifer",
    lifecycle:             "perennial",
    location:              "North Hedge",
    watering_zone:         "East Bed",
    frost_tolerance_min_c: -30,
    temperature_protected: false,
    purchase_date:         "2017-10-05",
    description:           "Popular evergreen conifer for hedges and privacy screening. Grows evenly and densely, tolerates regular pruning very well. Extremely frost-hardy and low-maintenance.",
    care_notes:            "Prune twice a year. Avoid cutting back too hard — brown patches do not regenerate.",
    schedules: [
      { id:"sched-005-foliage", schedule_type:"foliage", start_week:1,  end_week:52, color:"#2d5a1b", label:"Evergreen" },
      { id:"sched-005-prune1",  schedule_type:"pruning", start_week:21, end_week:23, color:"#27ae60", label:"Spring Pruning" },
      { id:"sched-005-prune2",  schedule_type:"pruning", start_week:33, end_week:35, color:"#2ecc71", label:"Autumn Pruning" },
    ],
  },
];

// ── Seed ──────────────────────────────────────────────────────────────────────

type AnyDb = BetterSQLite3Database<typeof schema>;

/**
 * Idempotent seed function.
 *
 * Accepts an optional `dbInstance` so tests can pass an in-memory database.
 * When called without arguments it uses the shared production database.
 *
 * Accepts an optional `dataDir` (default: DATA_DIR env or "./data") to
 * locate the static file serving root, used to install the example garden plan.
 *
 * Safe to call on every server startup:
 * - Singleton rows (garden, settings) use INSERT OR IGNORE
 * - Color presets and plants are only inserted when their tables are empty
 * - Garden plan is only copied when plan_url is still NULL
 */
export async function seed(
  dbInstance: AnyDb = defaultDb,
  dataDir: string = process.env.DATA_DIR ?? "./data",
): Promise<void> {
  // ── Garden plan ────────────────────────────────────────────────────────────
  // Insert the singleton row first (with plan_url null), then try to install
  // the example plan image only when no plan has been set yet.
  await dbInstance
    .insert(garden)
    .values({ id: "garden", plan_url: null, plan_name: null })
    .onConflictDoNothing();

  const gardenRow = dbInstance.select().from(garden).get();
  if (!gardenRow?.plan_url && fs.existsSync(EXAMPLE_PLAN_SRC)) {
    const destDir  = path.join(dataDir, "static", "garden");
    const destFile = path.join(destDir, "example_garden.png");
    try {
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(EXAMPLE_PLAN_SRC, destFile);
      dbInstance
        .update(garden)
        .set({ plan_url: "/static/garden/example_garden.png", plan_name: "Example Garden" })
        .run();
      console.log("Example garden plan installed.");
    } catch (err) {
      // Non-fatal — the app works fine without a plan image
      console.warn("Could not install example garden plan:", err);
    }
  }

  // Settings singleton — only inserted when not yet present.
  // Existing user data is never overwritten.
  await dbInstance
    .insert(settings)
    .values({
      id:                       "settings",
      language:                 "en",
      location_city:            null,
      location_zip:             null,
      irrigation_zones:         DEFAULT_IRRIGATION_ZONES,
      plant_categories:         DEFAULT_PLANT_CATEGORIES,
      task_lookback_weeks:      8,
      task_lookahead_weeks:     4,
      attachment_size_limit_mb: 10,
      ai_provider:              null,
      ai_model:                 null,
      ai_api_key:               null,
    })
    .onConflictDoNothing();

  // Color presets — only insert when table is empty.
  // This preserves any presets the user has already configured.
  const existingPresets = dbInstance.select().from(colorPresets).all();
  if (existingPresets.length === 0) {
    DEFAULT_COLOR_PRESETS.forEach((preset, index) => {
      dbInstance.insert(colorPresets).values({
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

  // Sample plants — only insert when plants table is empty
  const existingPlants = dbInstance.select().from(plants).all();
  if (existingPlants.length === 0) {
    for (const plant of DEFAULT_PLANTS) {
      dbInstance.insert(plants).values({
        id:                      plant.id,
        name_common:             plant.name_common,
        name_botanical:          plant.name_botanical,
        icon:                    plant.icon,
        category:                plant.category,
        lifecycle:               plant.lifecycle,
        location:                plant.location,
        watering_zone:           plant.watering_zone,
        frost_tolerance_min_c:   plant.frost_tolerance_min_c,
        temperature_protected:   plant.temperature_protected,
        description:             plant.description,
        care_notes:              plant.care_notes,
        purchase_date:           plant.purchase_date,
        created_at:              NOW,
        updated_at:              NOW,
      }).run();

      for (const sched of plant.schedules) {
        dbInstance.insert(schedules).values({
          id:            sched.id,
          plant_id:      plant.id,
          schedule_type: sched.schedule_type,
          start_week:    sched.start_week,
          end_week:      sched.end_week,
          color:         sched.color,
          label:         sched.label,
          created_at:    NOW,
          updated_at:    NOW,
        }).run();
      }
    }
    console.log(`Inserted ${DEFAULT_PLANTS.length} sample plants.`);
  } else {
    console.log(`Plants already exist (${existingPlants.length} rows) — skipped.`);
  }

  console.log("Seed complete.");
}

// ── CLI entrypoint ────────────────────────────────────────────────────────────
// Only runs when executed directly via `pnpm db:seed` (tsx src/db/seed.ts).
// Importing this module from server.ts does NOT trigger the CLI block.

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] !== undefined &&
  new URL(import.meta.url).pathname === process.argv[1];

if (isMain) {
  seed().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
