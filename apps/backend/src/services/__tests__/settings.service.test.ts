/**
 * Settings service tests.
 *
 * Verifies that getSettings() reads the DB correctly and
 * updateSettings() persists all fields including color_presets.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import { resolve } from "path";
import { fileURLToPath } from "url";
import * as schema from "../../db/schema.js";
import { getSettings, updateSettings } from "../settings.service.js";
import type { Settings } from "@api/settings.js";

const __dirname  = fileURLToPath(new URL(".", import.meta.url));
const MIGRATIONS = resolve(__dirname, "../../../drizzle");

function createTestDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS });
  db.insert(schema.settings).values({ id: "settings", language: "de" }).onConflictDoNothing().run();
  return db;
}

const BASE_SETTINGS: Settings = {
  language:                 "de",
  location_city:            null,
  location_zip:             null,
  irrigation_zones:         [],
  plant_categories:         [],
  color_presets:            [],
  task_lookback_weeks:      2,
  task_lookahead_weeks:     4,
  attachment_size_limit_mb: 10,
  ai_provider:              null,
  ai_model:                 null,
  ai_api_key:               null,
  gardener_profile:         null,
};

describe("getSettings()", () => {
  let db: ReturnType<typeof createTestDb>;
  beforeEach(() => { db = createTestDb(); });

  it("returns default settings from seeded row", () => {
    const s = getSettings(db as any);
    expect(s.language).toBe("de");
    expect(s.task_lookback_weeks).toBe(8);
    expect(s.task_lookahead_weeks).toBe(4);
    expect(s.attachment_size_limit_mb).toBe(10);
    expect(s.irrigation_zones).toEqual([]);
    expect(s.plant_categories).toEqual([]);
    expect(s.color_presets).toEqual([]);
  });

  it("returns fallback defaults when settings row is missing", () => {
    db.delete(schema.settings).run();
    const s = getSettings(db as any);
    expect(s.language).toBe("en");
    expect(s.task_lookback_weeks).toBe(8);
  });
});

describe("updateSettings()", () => {
  let db: ReturnType<typeof createTestDb>;
  beforeEach(() => { db = createTestDb(); });

  it("persists location fields", () => {
    updateSettings(db as any, { ...BASE_SETTINGS, location_city: "München", location_zip: "80331" });
    const s = getSettings(db as any);
    expect(s.location_city).toBe("München");
    expect(s.location_zip).toBe("80331");
  });

  it("persists language change", () => {
    updateSettings(db as any, { ...BASE_SETTINGS, language: "en" });
    const s = getSettings(db as any);
    expect(s.language).toBe("en");
  });

  it("persists irrigation_zones as JSON array", () => {
    updateSettings(db as any, { ...BASE_SETTINGS, irrigation_zones: ["Zone A", "Terrasse"] });
    const s = getSettings(db as any);
    expect(s.irrigation_zones).toEqual(["Zone A", "Terrasse"]);
  });

  it("persists plant_categories as JSON array", () => {
    updateSettings(db as any, { ...BASE_SETTINGS, plant_categories: ["Rosen", "Gemüse"] });
    const s = getSettings(db as any);
    expect(s.plant_categories).toEqual(["Rosen", "Gemüse"]);
  });

  it("persists color_presets and reads them back in order", () => {
    const presets = [
      { schedule_type: "bloom" as const, name: "Rot",   color: "#c0392b" },
      { schedule_type: "bloom" as const, name: "Pink",  color: "#e91e8c" },
    ];
    updateSettings(db as any, { ...BASE_SETTINGS, color_presets: presets });
    const s = getSettings(db as any);
    expect(s.color_presets).toHaveLength(2);
    expect(s.color_presets[0].name).toBe("Rot");
    expect(s.color_presets[1].name).toBe("Pink");
  });

  it("replaces color_presets on subsequent save (no duplicates)", () => {
    updateSettings(db as any, { ...BASE_SETTINGS, color_presets: [
      { schedule_type: "bloom" as const, name: "Rot", color: "#c0392b" },
    ]});
    updateSettings(db as any, { ...BASE_SETTINGS, color_presets: [
      { schedule_type: "pruning" as const, name: "Grün", color: "#27ae60" },
    ]});
    const s = getSettings(db as any);
    expect(s.color_presets).toHaveLength(1);
    expect(s.color_presets[0].name).toBe("Grün");
  });

  it("returns the updated settings from the call itself", () => {
    const result = updateSettings(db as any, { ...BASE_SETTINGS, location_city: "Berlin" });
    expect(result.location_city).toBe("Berlin");
  });

  it("persists ai_api_key (stored locally)", () => {
    updateSettings(db as any, { ...BASE_SETTINGS, ai_provider: "anthropic", ai_model: "claude-sonnet-4-6", ai_api_key: "sk-test" });
    const s = getSettings(db as any);
    expect(s.ai_provider).toBe("anthropic");
    expect(s.ai_model).toBe("claude-sonnet-4-6");
    expect(s.ai_api_key).toBe("sk-test");
  });
});
