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
import { garden, settings, colorPresets, plants, schedules } from "./schema.js";

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
  { schedule_type: "pruning", name: "Frühlingsschnitt", color: "#27ae60" },
  { schedule_type: "pruning", name: "Herbstschnitt",    color: "#2ecc71" },
  // Düngung (fertilization)
  { schedule_type: "fertilization", name: "Düngen",       color: "#3498db" },
  { schedule_type: "fertilization", name: "Herbstdünger", color: "#2980b9" },
  // Sonstiges (misc)
  { schedule_type: "misc", name: "Lüften",      color: "#e67e22" },
  { schedule_type: "misc", name: "Vertikutieren", color: "#7f8c8d" },
  { schedule_type: "misc", name: "Ernte",        color: "#3498db" },
  { schedule_type: "misc", name: "Aussähen",     color: "#f1c40f" },
];

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
    name_common:           "Rote Rose",
    name_botanical:        "Rosa",
    icon:                  "🌹",
    category:              "Strauch",
    lifecycle:             "perennial",
    location:              "Beet West",
    watering_zone:         "Beet West",
    frost_tolerance_min_c: -15,
    temperature_protected: false,
    purchase_date:         "2022-03-15",
    description:           "Klassische Gartenrose mit üppiger Blüte von Mai bis September. Bevorzugt sonnige, windgeschützte Standorte mit nährstoffreichem, leicht saurem Boden. Robust und langlebig bei richtiger Pflege.",
    care_notes:            "Nach Blüte entblättern. Kein Stickstoff nach August. Winterschutz ab November empfohlen.",
    schedules: [
      { id:"sched-001-bloom",  schedule_type:"bloom",         start_week:18, end_week:38, color:"#e74c3c", label:"Rot" },
      { id:"sched-001-prune1", schedule_type:"pruning",       start_week:9,  end_week:11, color:"#27ae60", label:"Frühlingsschnitt" },
      { id:"sched-001-prune2", schedule_type:"pruning",       start_week:32, end_week:33, color:"#2ecc71", label:"Herbstschnitt" },
      { id:"sched-001-fert",   schedule_type:"fertilization", start_week:15, end_week:20, color:"#3498db", label:"Düngen" },
    ],
  },
  {
    id:                    "plant-seed-002",
    name_common:           "Rhododendron",
    name_botanical:        "Rhododendron hyb.",
    icon:                  "💐",
    category:              "Strauch",
    lifecycle:             "evergreen",
    location:              "Terrasse",
    watering_zone:         "Terrasse",
    frost_tolerance_min_c: -10,
    temperature_protected: false,
    purchase_date:         "2020-04-10",
    description:           "Immergrüner Zierstrauch mit spektakulärer Frühlingsblüte in Lila und Pink. Benötigt sauren, humusreichen Boden ohne Kalk. Ideal als Solitärpflanze oder in Gruppen an halbschattigen Standorten.",
    care_notes:            "Kalkfreies Substrat wichtig. Rhododendron-Dünger verwenden. Kein Rückschnitt nötig.",
    schedules: [
      { id:"sched-002-bloom", schedule_type:"bloom",         start_week:14, end_week:22, color:"#9b59b6", label:"Lila" },
      { id:"sched-002-fert",  schedule_type:"fertilization", start_week:14, end_week:20, color:"#3498db", label:"Düngen" },
    ],
  },
  {
    id:                    "plant-seed-003",
    name_common:           "Magnolia",
    name_botanical:        "Magnolia grandiflora",
    icon:                  "🌸",
    category:              "Baum",
    lifecycle:             "evergreen",
    location:              "Nordwest",
    watering_zone:         "Rasen",
    frost_tolerance_min_c: -20,
    temperature_protected: false,
    purchase_date:         "2016-05-01",
    description:           "Großblättriger immergrüner Baum mit beeindruckenden weißen Blüten im April und Mai. Wächst langsam, wird aber mit den Jahren ein imposantes Exemplar. Kalkfreier, feuchter Boden ist wichtig.",
    care_notes:            "Kein Rückschnitt nötig. Frühjahrsblüher – nicht vor dem Frost düngen.",
    schedules: [
      { id:"sched-003-bloom",   schedule_type:"bloom",         start_week:14, end_week:19, color:"#ffffff", label:"Weiß" },
      { id:"sched-003-foliage", schedule_type:"foliage",       start_week:1,  end_week:52, color:"#2d5a1b", label:"Immergrün" },
    ],
  },
  {
    id:                    "plant-seed-004",
    name_common:           "Apfelbaum",
    name_botanical:        "Malus domestica",
    icon:                  "🍎",
    category:              "Obstbaum",
    lifecycle:             "perennial",
    location:              "Mitte",
    watering_zone:         "Rasen",
    frost_tolerance_min_c: -25,
    temperature_protected: false,
    purchase_date:         "2012-03-20",
    description:           "Bewährte Apfelsorte Elstar mit süß-säuerlichen Früchten, erntereif ab September. Der Baum ist robust, selbstfruchtend und erträgt Frost bis -25°C. Regelmäßiger Schnitt fördert Fruchtqualität und Vitalität.",
    care_notes:            "Schnitt im Winterschlaf. Ausdünnen der Früchte im Juni empfohlen. Sorte: Elstar.",
    schedules: [
      { id:"sched-004-bloom",  schedule_type:"bloom",         start_week:16, end_week:19, color:"#f8c8d0", label:"Zartrosa" },
      { id:"sched-004-prune",  schedule_type:"pruning",       start_week:6,  end_week:9,  color:"#2ecc71", label:"Herbstschnitt" },
      { id:"sched-004-fert",   schedule_type:"fertilization", start_week:13, end_week:16, color:"#3498db", label:"Düngen" },
      { id:"sched-004-misc",   schedule_type:"misc",          start_week:36, end_week:41, color:"#3498db", label:"Ernte" },
    ],
  },
  {
    id:                    "plant-seed-005",
    name_common:           "Lebensbaum",
    name_botanical:        "Thuja occidentalis",
    icon:                  "🌲",
    category:              "Nadelbaum",
    lifecycle:             "evergreen",
    location:              "Hecke Nord",
    watering_zone:         "Beet Ost",
    frost_tolerance_min_c: -30,
    temperature_protected: false,
    purchase_date:         "2017-10-05",
    description:           "Beliebter immergrüner Nadelbaum für Hecken und Sichtschutz. Wächst gleichmäßig und dicht, verträgt regelmäßigen Schnitt sehr gut. Extrem frosthart und anspruchslos in der Pflege.",
    care_notes:            "Schnitt zweimal jährlich. Nicht zu stark zurückschneiden – braune Stellen treiben nicht wieder aus.",
    schedules: [
      { id:"sched-005-foliage",  schedule_type:"foliage",  start_week:1,  end_week:52, color:"#2d5a1b", label:"Immergrün" },
      { id:"sched-005-prune1",   schedule_type:"pruning",  start_week:21, end_week:23, color:"#27ae60", label:"Frühlingsschnitt" },
      { id:"sched-005-prune2",   schedule_type:"pruning",  start_week:33, end_week:35, color:"#2ecc71", label:"Herbstschnitt" },
    ],
  },
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

  // Sample plants — only insert when plants table is empty
  const existingPlants = db.select().from(plants).all();
  if (existingPlants.length === 0) {
    for (const plant of DEFAULT_PLANTS) {
      db.insert(plants).values({
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
        db.insert(schedules).values({
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

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
