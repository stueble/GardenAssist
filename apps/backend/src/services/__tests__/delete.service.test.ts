/**
 * Delete service tests.
 *
 * Tests deleteAllData() functionality: clearing all user data while preserving singletons.
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
import { garden, settings, plants, journalEntries } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { getGarden } from "../garden.service.js";
import { getSettings } from "../settings.service.js";
import { createPlant } from "../plant.service.js";
import { deleteAllData } from "../delete.service.js";
import type { PlantInput } from "@api/api.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, "../../../drizzle");

function createTestDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  db.insert(garden).values({ id: "garden" }).onConflictDoNothing().run();
  db.insert(settings).values({ id: "settings", language: "de" }).onConflictDoNothing().run();
  return db;
}

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

  it("deletes all plants and journal entries", async () => {
    // Create test data
    const plantInput: PlantInput = {
      name_common: "Test Plant",
      name_botanical: "Test Bot",
      icon: "🌱",
      origin_type: null,
      category: null,
      lifecycle: null,
      description: null,
      care_notes: null,
      sun_demand: null,
      water_demand: null,
      soil_type: null,
      frost_tolerance_min_c: null,
      temperature_protected: false,
      health_status: null,
      location: null,
      watering_zone: null,
      purchase_date: null,
      purchase_price: null,
      thumbnail_attachment_id: null,
      positions: [],
      schedules: [],
      attachments: [],
    };

    const plant = await createPlant(db, plantInput);

    // Create journal entry
    db.insert(journalEntries)
      .values({
        id: "journal-1",
        plant_id: plant.id,
        schedule_id: null,
        week: "20",
        entry_type: "observation",
        date: "2026-05-08",
        title: "Test entry",
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .run();

    // Verify data exists
    let g = await getGarden(db);
    expect(g.plants).toHaveLength(1);
    expect(g.journal_entries).toHaveLength(1);

    // Delete all data
    const result = await deleteAllData(db, tempDir);

    // Verify all data deleted
    expect(result.plants).toHaveLength(0);
    expect(result.journal_entries).toHaveLength(0);
    expect(result.plan_url).toBeNull();
  });

  it("preserves singletons (garden and settings)", async () => {
    // Set custom values
    db.update(settings)
      .set({ ai_api_key: "test-key-123", task_lookback_weeks: 5 })
      .where(eq(settings.id, "settings"))
      .run();

    const plantInput: PlantInput = {
      name_common: "Test",
      name_botanical: null,
      icon: null,
      origin_type: null,
      category: null,
      lifecycle: null,
      description: null,
      care_notes: null,
      sun_demand: null,
      water_demand: null,
      soil_type: null,
      frost_tolerance_min_c: null,
      temperature_protected: false,
      health_status: null,
      location: null,
      watering_zone: null,
      purchase_date: null,
      purchase_price: null,
      thumbnail_attachment_id: null,
      positions: [],
      schedules: [],
      attachments: [],
    };

    await createPlant(db, plantInput);

    // Delete all
    await deleteAllData(db, tempDir);

    // Check singletons preserved
    const updatedSettings = getSettings(db);
    expect(updatedSettings.ai_api_key).toBe("test-key-123");
    expect(updatedSettings.task_lookback_weeks).toBe(5);

    const updatedGarden = await getGarden(db);
    expect(updatedGarden).toBeDefined();
  });

  it("deletes garden-level journal entries", async () => {
    const now = new Date().toISOString();

    // Create garden-level entry (plant_id = null)
    db.insert(journalEntries)
      .values({
        id: "garden-entry",
        plant_id: null,
        schedule_id: null,
        week: null as any,
        entry_type: "observation",
        date: "2026-05-08",
        title: "Garden note",
        notes: null,
        created_at: now,
        updated_at: now,
      })
      .run();

    let g = await getGarden(db);
    expect(g.journal_entries).toHaveLength(1);

    // Delete all
    await deleteAllData(db, tempDir);

    // Verify deleted
    const result = await getGarden(db);
    expect(result.journal_entries).toHaveLength(0);
  });

  it("resets garden plan_url to null", async () => {
    // Set plan URL (simulated)
    db.update(garden)
      .set({ plan_url: "/static/garden/plan.png" })
      .where(eq(garden.id, "garden"))
      .run();

    let g = await getGarden(db);
    expect(g.plan_url).not.toBeNull();

    // Delete all
    await deleteAllData(db, tempDir);

    // Verify plan_url reset
    const result = await getGarden(db);
    expect(result.plan_url).toBeNull();
  });
});
