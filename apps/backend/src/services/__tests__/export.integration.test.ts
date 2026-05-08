/**
 * Export/Import integration tests.
 *
 * Full round-trip test: Create data → Export backup → Delete data → Import backup → Verify restored
 * Uses in-memory SQLite with real migrations and seeded data.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import Database from "better-sqlite3";
import { resolve } from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as schema from "../../db/schema.js";
import { garden, settings, plants, journalEntries } from "../../db/schema.js";
import { getGarden } from "../garden.service.js";
import { getSettings } from "../settings.service.js";
import { createPlant } from "../plant.service.js";
import { exportJsonData, exportBackupTarGz } from "../export.service.js";
import { importJsonData, importBackupTarGz } from "../import.service.js";
import type { PlantInput } from "@api/api.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, "../../../drizzle");

function createTestDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  // Seed singletons
  db.insert(garden).values({ id: "garden" }).onConflictDoNothing().run();
  db.insert(settings).values({ id: "settings", language: "de" }).onConflictDoNothing().run();
  return db;
}

describe("Export/Import Full Round-Trip", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "garden-integration-test-"));
    fs.mkdirSync(path.join(tempDir, "static", "attachments"), { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it("round-trip: export → delete → import → verify all data restored", async () => {
    // 1. CREATE TEST DATA
    const db1 = createTestDb();

    // Create some plants
    const plant1Input: PlantInput = {
      name_common: "Rose",
      name_botanical: "Rosa",
      icon: "🌹",
      origin_type: "native",
      category: "Flowers",
      lifecycle: "perennial",
      description: "A beautiful rose",
      care_notes: "Water regularly",
      sun_demand: "sunny",
      water_demand: "medium",
      soil_type: "loamy",
      frost_tolerance_min_c: -10,
      temperature_protected: false,
      health_status: null,
      location: "Garden bed A",
      watering_zone: "Zone 1",
      purchase_date: "2024-01-15",
      purchase_price: 25.99,
      thumbnail_attachment_id: null,
      positions: [{ x_percent: 10, y_percent: 20 }],
      schedules: [
        {
          schedule_type: "bloom",
          start_week: 15,
          end_week: 35,
          color: "#ff0000",
          label: "Bloom",
          notes: null,
        },
      ],
      attachments: [],
    };

    const plant1 = await createPlant(db1, plant1Input);
    expect(plant1.id).toBeDefined();

    // Create journal entry for the plant
    const journalEntry = db1
      .insert(journalEntries)
      .values({
        id: "journal-1",
        plant_id: plant1.id,
        schedule_id: null,
        week: 20,
        entry_type: "observation",
        date: "2026-05-08",
        title: "Plant is flowering nicely",
        notes: "Pink blooms appeared",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning()
      .get();

    expect(journalEntry).toBeDefined();

    // Verify initial state
    let garden1 = await getGarden(db1);
    expect(garden1.plants).toHaveLength(1);
    expect(garden1.journal_entries).toHaveLength(1);

    // 2. EXPORT BACKUP
    const backup = await exportBackupTarGz(db1, tempDir);
    expect(backup).toBeInstanceOf(Buffer);
    expect(backup.length).toBeGreaterThan(0);

    // 3. DELETE ALL DATA
    const db2 = createTestDb();
    db2.delete(journalEntries).run();
    db2.delete(plants).run();

    let garden2 = await getGarden(db2);
    expect(garden2.plants).toHaveLength(0);
    expect(garden2.journal_entries).toHaveLength(0);

    // 4. IMPORT BACKUP
    const result = await importBackupTarGz(db2, backup, tempDir, { skipErrors: true });

    // Verify import succeeded
    expect(result.skipped_count).toBe(0); // No errors
    expect(result.skipped_errors).toHaveLength(0);
    expect(result.garden.plants).toHaveLength(1);
    expect(result.garden.journal_entries).toHaveLength(1);

    // 5. VERIFY ALL DATA RESTORED
    const garden3 = await getGarden(db2);

    // Check plants
    expect(garden3.plants).toHaveLength(1);
    const restoredPlant = garden3.plants[0];
    expect(restoredPlant.name_common).toBe("Rose");
    expect(restoredPlant.name_botanical).toBe("Rosa");
    expect(restoredPlant.location).toBe("Garden bed A");
    expect(restoredPlant.watering_zone).toBe("Zone 1");
    expect(restoredPlant.positions).toHaveLength(1);
    expect(restoredPlant.schedules).toHaveLength(1);
    expect(restoredPlant.schedules[0].schedule_type).toBe("bloom");

    // Check journal entries
    expect(garden3.journal_entries).toHaveLength(1);
    const restoredEntry = garden3.journal_entries[0];
    expect(restoredEntry.plant_id).toBe(restoredPlant.id);
    expect(restoredEntry.title).toBe("Plant is flowering nicely");
    expect(restoredEntry.entry_type).toBe("observation");

    // Check settings preserved
    const settings3 = getSettings(db2);
    expect(settings3.language).toBe("de");
  });

  it("import handles journal entries with null plant_id gracefully", async () => {
    // 1. CREATE DATA with journal entry that has no plant reference
    const db1 = createTestDb();

    // Create a journal entry with plant_id=null (garden-level entry)
    const now = new Date().toISOString();
    db1.insert(journalEntries)
      .values({
        id: "garden-entry",
        plant_id: null, // Garden-level entry, not plant-specific
        schedule_id: null,
        week: null,
        entry_type: "observation",
        date: "2026-05-08",
        title: "Garden observation",
        notes: "General garden note",
        created_at: now,
        updated_at: now,
      })
      .run();

    // 2. EXPORT (should export the entry)
    const exportData = await exportJsonData(db1);
    expect(exportData.garden.journal_entries).toHaveLength(1);
    expect(exportData.garden.journal_entries[0].plant_id).toBeNull();

    // 3. IMPORT into fresh DB
    const db2 = createTestDb();
    const result = await importJsonData(db2, exportData, { skipErrors: true });

    // Verify the entry was imported successfully
    expect(result.skipped_count).toBe(0);
    expect(result.skipped_errors.length).toBe(0);
    expect(result.garden.journal_entries).toHaveLength(1);
    expect(result.garden.journal_entries[0].plant_id).toBeNull();
  });

  it("settings api_key is preserved during round-trip", async () => {
    const db1 = createTestDb();

    // Set API key
    db1.update(settings)
      .set({ ai_api_key: "secret-original-key-123" })
      .where(eq(settings.id, "settings"))
      .run();

    let settings1 = getSettings(db1);
    expect(settings1.ai_api_key).toBe("secret-original-key-123");

    // Export (should NOT include api_key)
    const exportData = await exportJsonData(db1);
    expect(exportData.settings.ai_api_key).toBeNull();

    // Import into fresh DB that has a different API key
    const db2 = createTestDb();
    db2.update(settings)
      .set({ ai_api_key: "secret-new-key-456" })
      .where(eq(settings.id, "settings"))
      .run();

    await importJsonData(db2, exportData, { skipErrors: true });

    // Verify new API key was preserved (not overwritten)
    let settings2 = getSettings(db2);
    expect(settings2.ai_api_key).toBe("secret-new-key-456");
  });
});
