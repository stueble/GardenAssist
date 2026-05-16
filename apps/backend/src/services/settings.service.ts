/**
 * Settings service — reads and writes the singleton settings row.
 *
 * color_presets are stored as individual rows in the color_presets table
 * and managed as part of Settings in the API (always read/written as a list).
 */



import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema.js";
import type { Settings }    from "@api/settings.js";
import type { ColorPreset } from "@api/color-preset.js";

type Db = BetterSQLite3Database<typeof schema>;

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapColorPreset(row: typeof schema.colorPresets.$inferSelect): ColorPreset {
  return {
    schedule_type: row.schedule_type as ColorPreset["schedule_type"],
    name:          row.name,
    color:         row.color,
  };
}

function mapSettings(
  row: typeof schema.settings.$inferSelect,
  colorPresets: ColorPreset[],
): Settings {
  return {
    language:                 (row.language ?? "en") as Settings["language"],
    location_city:            row.location_city ?? null,
    location_zip:             row.location_zip  ?? null,
    irrigation_zones:         JSON.parse(row.irrigation_zones ?? "[]") as string[],
    plant_categories:         JSON.parse(row.plant_categories ?? "[]") as string[],
    color_presets:            colorPresets,
    soil_moisture_dry_threshold_pct: row.soil_moisture_dry_threshold_pct,
    task_lookback_weeks:      row.task_lookback_weeks,
    task_lookahead_weeks:     row.task_lookahead_weeks,
    attachment_size_limit_mb: row.attachment_size_limit_mb,
    ai_provider:              (row.ai_provider ?? null) as Settings["ai_provider"],
    ai_model:                 row.ai_model         ?? null,
    ai_api_key:               row.ai_api_key        ?? null,
    gardener_profile:         (row.gardener_profile ?? null) as Settings["gardener_profile"],
  };
}

// ── getSettings ───────────────────────────────────────────────────────────────

export function getSettings(db: Db): Settings {
  const rows = db.select().from(schema.settings).all();
  const row  = rows[0];

  const presetRows = db
    .select()
    .from(schema.colorPresets)
    .orderBy(schema.colorPresets.sort_order)
    .all();

  const colorPresets = presetRows.map(mapColorPreset);

  if (!row) {
    // Singleton not yet seeded — return defaults
    return {
      language:                 "en",
      location_city:            null,
      location_zip:             null,
      irrigation_zones:         [],
      plant_categories:         [],
      color_presets:            colorPresets,
      soil_moisture_dry_threshold_pct: 40,
      task_lookback_weeks:      8,
      task_lookahead_weeks:     4,
      attachment_size_limit_mb: 10,
      ai_provider:              null,
      ai_model:                 null,
      ai_api_key:               null,
      gardener_profile:         null,
    };
  }

  return mapSettings(row, colorPresets);
}

// ── updateSettings ────────────────────────────────────────────────────────────

export function updateSettings(db: Db, data: Settings): Settings {
  // UPSERT the singleton settings row.
  // A plain UPDATE has no effect when the table is empty (e.g. fresh install
  // without running db:seed), so we use INSERT … ON CONFLICT DO UPDATE instead.
  db.insert(schema.settings)
    .values({
      id:                       "settings",
      language:                 data.language,
      location_city:            data.location_city,
      location_zip:             data.location_zip,
      irrigation_zones:         JSON.stringify(data.irrigation_zones),
      plant_categories:         JSON.stringify(data.plant_categories),
      soil_moisture_dry_threshold_pct: data.soil_moisture_dry_threshold_pct,
      task_lookback_weeks:      data.task_lookback_weeks,
      task_lookahead_weeks:     data.task_lookahead_weeks,
      attachment_size_limit_mb: data.attachment_size_limit_mb,
      ai_provider:              data.ai_provider,
      ai_model:                 data.ai_model,
      ai_api_key:               data.ai_api_key,
      gardener_profile:         data.gardener_profile,
    })
    .onConflictDoUpdate({
      target: schema.settings.id,
      set: {
        language:                 data.language,
        location_city:            data.location_city,
        location_zip:             data.location_zip,
        irrigation_zones:         JSON.stringify(data.irrigation_zones),
        plant_categories:         JSON.stringify(data.plant_categories),
        soil_moisture_dry_threshold_pct: data.soil_moisture_dry_threshold_pct,
        task_lookback_weeks:      data.task_lookback_weeks,
        task_lookahead_weeks:     data.task_lookahead_weeks,
        attachment_size_limit_mb: data.attachment_size_limit_mb,
        ai_provider:              data.ai_provider,
        ai_model:                 data.ai_model,
        ai_api_key:               data.ai_api_key,
        gardener_profile:         data.gardener_profile,
      },
    })
    .run();

  // Replace all color presets (delete + insert)
  db.delete(schema.colorPresets).run();
  if (data.color_presets.length > 0) {
    data.color_presets.forEach((preset, index) => {
      db.insert(schema.colorPresets).values({
        id:            crypto.randomUUID(),
        schedule_type: preset.schedule_type,
        name:          preset.name,
        color:         preset.color,
        sort_order:    index,
      }).run();
    });
  }

  return getSettings(db);
}
