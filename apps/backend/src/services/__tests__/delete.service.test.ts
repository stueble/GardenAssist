/**
 * Tests for deleteAllData() and resetToDefaults().
 *
 * deleteAllData(): Wipes everything — all tables. Singletons re-created empty.
 * resetToDefaults(): Same wipe, but re-seeds color presets and default settings.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import { resolve } from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as schema from "../../db/schema.js";
import { garden, settings, plants, journalEntries, colorPresets } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { getGarden } from "../garden.service.js";
import { getSettings } from "../settings.service.js";
import { createPlant } from "../plant.service.js";
import { deleteAllData, installDefaults } from "../delete.service.js";
import type { PlantInput } from "@api/api.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, "../../../drizzle");

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  db.insert(garden).values({ id: "garden" }).onConflictDoNothing().run();
  db.insert(settings).values({ id: "settings", language: "de" }).onConflictDoNothing().run();
  return db;
}

const MINIMAL_PLANT: PlantInput = {
  name_common:             "Test Plant",
  name_botanical:          null,
  icon:                    null,
  origin_type:             null,
  category:                null,
  lifecycle:               null,
  description:             null,
  care_notes:              null,
  sun_demand:              null,
  water_demand:            null,
  soil_type:               null,
  frost_tolerance_min_c:   null,
  temperature_protected:   false,
  health_status:           null,
  location:                null,
  watering_zone:           null,
  purchase_date:           null,
  purchase_price:          null,
  
  positions:               [],
  schedules:               [],
  attachments:             [],
};

// ── deleteAllData() ───────────────────────────────────────────────────────────

describe("deleteAllData()", () => {
  let db: ReturnType<typeof createTestDb>;
  let tempDir: string;

  beforeEach(() => {
    db = createTestDb();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "garden-delete-test-"));
    fs.mkdirSync(path.join(tempDir, "static", "attachments"), { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it("deletes all plants, schedules, positions, and journal entries", async () => {
    await createPlant(db, MINIMAL_PLANT);
    db.insert(journalEntries).values({
      id: "je-1", plant_id: null, schedule_id: null, week: null,
      entry_type: "observation", date: "2026-01-01", title: "note",
      notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).run();

    const result = await deleteAllData(db, tempDir);

    expect(result.plants).toHaveLength(0);
    expect(result.journal_entries).toHaveLength(0);
    expect(db.select().from(schema.schedules).all()).toHaveLength(0);
    expect(db.select().from(schema.plantPositions).all()).toHaveLength(0);
  });

  it("deletes all attachments from the database", async () => {
    db.insert(schema.attachments).values({
      id: "att-1", owner_type: "garden", owner_id: null,
      attachment_type: "image", category: null,
      url: "/static/attachments/garden/garden/test.jpg",
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).run();

    await deleteAllData(db, tempDir);

    expect(db.select().from(schema.attachments).all()).toHaveLength(0);
  });

  it("deletes attachment files from disk", async () => {
    const attachmentDir = path.join(tempDir, "static", "attachments", "garden", "garden");
    fs.mkdirSync(attachmentDir, { recursive: true });
    const filePath = path.join(attachmentDir, "photo.jpg");
    fs.writeFileSync(filePath, "fake image data");
    expect(fs.existsSync(filePath)).toBe(true);

    db.insert(schema.attachments).values({
      id: "att-file-1", owner_type: "garden", owner_id: null,
      attachment_type: "image", category: null,
      url: "/static/attachments/garden/garden/photo.jpg",
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).run();

    await deleteAllData(db, tempDir);

    expect(fs.existsSync(filePath)).toBe(false);
  });

  it("deletes color presets", async () => {
    db.insert(colorPresets).values({
      id: "cp-1", schedule_type: "bloom", name: "Rot", color: "#ff0000", sort_order: 0,
    }).run();

    await deleteAllData(db, tempDir);

    expect(db.select().from(schema.colorPresets).all()).toHaveLength(0);
  });

  it("re-creates garden and settings singletons as empty", async () => {
    db.update(settings)
      .set({ ai_api_key: "secret-key", location_city: "Berlin" })
      .where(eq(settings.id, "settings"))
      .run();

    await deleteAllData(db, tempDir);

    const updatedSettings = getSettings(db);
    expect(updatedSettings.ai_api_key).toBeNull();
    expect(updatedSettings.location_city).toBeNull();

    const updatedGarden = db.select().from(schema.garden).all();
    expect(updatedGarden).toHaveLength(1);
    expect(updatedGarden[0].plan_url).toBeNull();
    expect(updatedGarden[0].plan_name).toBeNull();
  });

  it("returns an empty garden after deletion", async () => {
    await createPlant(db, MINIMAL_PLANT);
    const result = await deleteAllData(db, tempDir);
    expect(result.plants).toHaveLength(0);
    expect(result.plan_url).toBeNull();
  });
});

// ── installDefaults() ─────────────────────────────────────────────────────────

describe("installDefaults()", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
  });

  it("installs default color presets", async () => {
    await installDefaults(db);

    const presets = db.select().from(schema.colorPresets).all();
    expect(presets.length).toBeGreaterThan(0);
    // Spot-check a known default preset (English keys)
    const red = presets.find((p) => p.name === "Red" && p.schedule_type === "bloom");
    expect(red).toBeDefined();
    expect(red?.color).toBe("#e74c3c");
  });

  it("replaces existing color presets in full", async () => {
    // Insert a custom preset first
    db.insert(colorPresets).values({
      id: "custom-1", schedule_type: "bloom", name: "Mein Spezialrot", color: "#deadbe", sort_order: 0,
    }).run();

    await installDefaults(db);

    const presets = db.select().from(schema.colorPresets).all();
    const custom = presets.find((p) => p.name === "Mein Spezialrot");
    expect(custom).toBeUndefined();
  });

  it("overwrites settings with factory values", async () => {
    db.update(settings)
      .set({ location_city: "München", task_lookback_weeks: 99 })
      .where(eq(settings.id, "settings"))
      .run();

    await installDefaults(db);

    const updatedSettings = getSettings(db);
    expect(updatedSettings.location_city).toBe("Cologne");
    expect(updatedSettings.location_zip).toBe("50667");
    expect(updatedSettings.task_lookback_weeks).toBe(8);
    expect(updatedSettings.task_lookahead_weeks).toBe(4);
  });

  it("preserves the AI API key", async () => {
    db.update(settings)
      .set({ ai_api_key: "my-secret-key" })
      .where(eq(settings.id, "settings"))
      .run();

    await installDefaults(db);

    const updatedSettings = getSettings(db);
    expect(updatedSettings.ai_api_key).toBe("my-secret-key");
  });

  it("installs default irrigation zones and plant categories", async () => {
    await installDefaults(db);

    const updatedSettings = getSettings(db);
    expect(updatedSettings.irrigation_zones).toContain("West Bed");
    expect(updatedSettings.irrigation_zones).toContain("Terrace");
    expect(updatedSettings.plant_categories).toContain("Shrub");
    expect(updatedSettings.plant_categories).toContain("Fruit Tree");
  });

  it("does NOT delete existing plants", async () => {
    await createPlant(db, MINIMAL_PLANT);

    await installDefaults(db);

    const result = await getGarden(db);
    expect(result.plants).toHaveLength(1);
  });
});
