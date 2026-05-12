/**
 * seed() unit tests.
 *
 * Verifies that seed() correctly populates a fresh database and is idempotent
 * when called multiple times (AC #2, #3).
 *
 * An in-memory SQLite database is used for isolation — no files left behind.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { resolve } from "path";
import { fileURLToPath } from "url";
import * as schema from "../schema.js";
import { garden, settings, colorPresets, plants } from "../schema.js";
import { seed } from "../seed.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, "../../../drizzle");

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}

describe("seed()", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
  });

  it("inserts the garden singleton row", async () => {
    await seed(db);
    const rows = db.select().from(garden).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("garden");
  });

  it("inserts the settings singleton row with correct defaults", async () => {
    await seed(db);
    const rows = db.select().from(settings).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].language).toBe("en");
    expect(rows[0].task_lookback_weeks).toBe(8);
    expect(rows[0].task_lookahead_weeks).toBe(4);
    expect(rows[0].attachment_size_limit_mb).toBe(10);
  });

  it("inserts default color presets", async () => {
    await seed(db);
    const rows = db.select().from(colorPresets).all();
    expect(rows.length).toBeGreaterThan(0);
  });

  it("inserts 5 sample plants", async () => {
    await seed(db);
    const rows = db.select().from(plants).all();
    expect(rows).toHaveLength(5);
  });

  it("is idempotent — calling seed() twice does not duplicate rows (AC #3)", async () => {
    await seed(db);
    await seed(db);

    const gardenRows    = db.select().from(garden).all();
    const settingsRows  = db.select().from(settings).all();
    const presetRows    = db.select().from(colorPresets).all();
    const plantRows     = db.select().from(plants).all();

    expect(gardenRows).toHaveLength(1);
    expect(settingsRows).toHaveLength(1);
    // Presets and plants are skipped on second run (tables already non-empty)
    const firstPresetCount = presetRows.length;
    const firstPlantCount  = plantRows.length;

    await seed(db);

    expect(db.select().from(colorPresets).all()).toHaveLength(firstPresetCount);
    expect(db.select().from(plants).all()).toHaveLength(firstPlantCount);
  });

  it("does not overwrite existing settings (AC #3)", async () => {
    // Simulate a user who already configured their language preference
    await seed(db);
    db.update(settings)
      .set({ language: "de" })
      .run();

    // Running seed again must not reset language back to 'en'
    await seed(db);

    const rows = db.select().from(settings).all();
    expect(rows[0].language).toBe("de");
  });

  it("does not overwrite existing plants when user has their own plants (AC #3)", async () => {
    // Insert a user plant first
    const now = new Date().toISOString();
    db.insert(plants).values({
      id:                    "my-plant",
      name_common:           "Meine Pflanze",
      temperature_protected: false,
      created_at:            now,
      updated_at:            now,
    }).run();

    await seed(db);

    // Seed should skip sample plants because the table is not empty
    const rows = db.select().from(plants).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("my-plant");
  });
});
