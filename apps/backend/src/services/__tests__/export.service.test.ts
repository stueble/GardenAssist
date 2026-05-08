/**
 * Export/Import service tests.
 *
 * Tests exportJsonData, exportBackupTarGz, importJsonData, and importBackupTarGz
 * using in-memory SQLite and temporary file storage.
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
import { garden, settings, plants, schedules, journalEntries, attachments, plantPositions } from "../../db/schema.js";
import { getGarden } from "../garden.service.js";
import { getSettings } from "../settings.service.js";
import { createPlant } from "../plant.service.js";
import { exportJsonData, exportBackupTarGz } from "../export.service.js";
import { importJsonData, importBackupTarGz } from "../import.service.js";
import type { PlantInput } from "@api/api.js";
import type { Plant } from "@api/plant.js";

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

describe("exportJsonData()", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
  });

  it("exports garden and settings without api_key", async () => {
    // Set an API key in settings
    db.update(settings)
      .set({ ai_api_key: "secret-key-12345" })
      .where(eq(settings.id, "settings"))
      .run();

    const result = await exportJsonData(db);

    expect(result.garden).toBeDefined();
    expect(result.settings).toBeDefined();
    // API key should be null in export
    expect(result.settings.ai_api_key).toBeNull();
  });

  it("includes all plants and schedules", async () => {
    // Create a plant with schedule
    const plantInput: PlantInput = {
      name_common: "Test Rose",
      name_botanical: "Rosa",
      icon: "🌹",
      origin_type: "native",
      category: "Flowers",
      lifecycle: "perennial",
      description: "A test rose",
      care_notes: "Water regularly",
      sun_demand: "sunny",
      water_demand: "medium",
      soil_type: "loamy",
      frost_tolerance_min_c: -10,
      temperature_protected: false,
      health_status: null,
      location: null,
      watering_zone: null,
      purchase_date: null,
      purchase_price: null,
      thumbnail_attachment_id: null,
      positions: [],
      schedules: [
        {
          id: "test-schedule-1",
          schedule_type: "bloom",
          start_week: 10,
          end_week: 40,
          color: "#ff0000",
          label: "Bloom",
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      attachments: [],
    };

    await createPlant(db, plantInput);

    const result = await exportJsonData(db);

    expect(result.garden.plants).toHaveLength(1);
    expect(result.garden.plants[0].name_common).toBe("Test Rose");
    expect(result.garden.plants[0].schedules).toHaveLength(1);
    expect(result.garden.plants[0].schedules[0].schedule_type).toBe("bloom");
  });

  it("returns valid JSON object", async () => {
    const result = await exportJsonData(db);

    // Should be serializable to JSON
    const jsonStr = JSON.stringify(result);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.garden).toBeDefined();
    expect(parsed.settings).toBeDefined();
  });
});

describe("exportBackupTarGz()", () => {
  let db: ReturnType<typeof createTestDb>;
  let tempDir: string;

  beforeEach(() => {
    db = createTestDb();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "garden-test-"));
    // Create necessary directory structure
    fs.mkdirSync(path.join(tempDir, "static", "attachments"), { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it("creates a tar.gz buffer", async () => {
    const buffer = await exportBackupTarGz(db, tempDir);

    expect(buffer).toBeInstanceOf(Buffer);
    // gzip magic number: 1f 8b
    expect(buffer[0]).toBe(0x1f);
    expect(buffer[1]).toBe(0x8b);
  });

  it("includes metadata.json in tar", async () => {
    const buffer = await exportBackupTarGz(db, tempDir);

    // Verify it's a valid gzip by extracting
    const { createGunzip } = await import("zlib");
    const gunzip = createGunzip();
    const chunks: Buffer[] = [];

    gunzip.on("data", (chunk) => chunks.push(chunk));

    return new Promise((resolve, reject) => {
      gunzip.on("end", () => {
        const tarData = Buffer.concat(chunks);
        // Check for metadata.json in tar header (first 100 bytes contain filename, null-terminated)
        const headerStr = tarData.slice(0, 100).toString("utf-8");
        const filename = headerStr.split("\0")[0].trim();
        expect(filename).toBe("metadata.json");
        resolve(undefined);
      });
      gunzip.on("error", reject);
      gunzip.write(buffer);
      gunzip.end();
    });
  });
});

describe("importJsonData()", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
  });

  it("upserts plants by id", async () => {
    const exportData = await exportJsonData(db);
    const now = new Date().toISOString();
    const newPlant: Plant = {
      id: "new-plant-1",
      name_common: "Imported Rose",
      name_botanical: "Rosa",
      icon: "🌹",
      origin_type: "native",
      category: "Flowers",
      lifecycle: "perennial",
      description: "A test plant",
      care_notes: "Water weekly",
      sun_demand: "sunny",
      water_demand: "medium",
      soil_type: "loamy",
      frost_tolerance_min_c: -5,
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
      journal_entries: [],
      tasks: [],
      created_at: now,
      updated_at: now,
    };

    const importData = {
      ...exportData,
      garden: {
        ...exportData.garden,
        plants: [...exportData.garden.plants, newPlant],
      },
    };

    const result = await importJsonData(db, importData, { skipErrors: true });

    expect(result.garden.plants).toHaveLength(1);
    expect(result.garden.plants[0].name_common).toBe("Imported Rose");
    expect(result.skipped_count).toBe(0);
  });

  it("preserves api_key in settings", async () => {
    // Set old API key
    db.update(settings)
      .set({ ai_api_key: "old-key" })
      .where(eq(settings.id, "settings"))
      .run();

    const exportData = await exportJsonData(db);
    // Export data has no api_key (it's null)
    expect(exportData.settings.ai_api_key).toBeNull();

    // Import it
    const result = await importJsonData(db, exportData, { skipErrors: true });

    // Old key should be preserved
    const updatedSettings = getSettings(db);
    expect(updatedSettings.ai_api_key).toBe("old-key");
  });

  it("returns result with skipped_count and skipped_errors", async () => {
    const exportData = await exportJsonData(db);

    const result = await importJsonData(db, exportData, { skipErrors: true });

    // Should return proper structure
    expect(result).toHaveProperty("skipped_count");
    expect(result).toHaveProperty("skipped_errors");
    expect(typeof result.skipped_count).toBe("number");
    expect(Array.isArray(result.skipped_errors)).toBe(true);
  });

  it("returns updated garden", async () => {
    const exportData = await exportJsonData(db);
    const result = await importJsonData(db, exportData, { skipErrors: true });

    expect(result.garden).toBeDefined();
    expect(result.garden.plants).toBeDefined();
    expect(result.garden.journal_entries).toBeDefined();
  });
});

describe("importBackupTarGz()", () => {
  let db: ReturnType<typeof createTestDb>;
  let tempDir: string;

  beforeEach(() => {
    db = createTestDb();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "garden-test-"));
    fs.mkdirSync(path.join(tempDir, "static", "attachments"), { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it("extracts and imports tar.gz backup", async () => {
    // Create a backup
    const backup = await exportBackupTarGz(db, tempDir);

    // Create new DB and import
    const db2 = createTestDb();
    const result = await importBackupTarGz(db2, backup, tempDir, { skipErrors: true });

    expect(result.garden).toBeDefined();
    expect(result.skipped_count).toBe(0);
  });
});
