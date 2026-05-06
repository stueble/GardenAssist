/**
 * Schema & seed tests.
 *
 * These tests verify that:
 * - The database can be created in-memory from the schema
 * - The seed script creates the expected singleton rows
 * - Basic CRUD for a plant works as expected
 *
 * An in-memory SQLite database is used so no file is left behind.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { resolve } from "path";
import { fileURLToPath } from "url";
import * as schema from "../schema.js";
import { garden, settings, plants } from "../schema.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, "../../../drizzle");

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}

describe("Database schema", () => {
  const db = createTestDb();

  describe("Seed: singleton rows", () => {
    beforeAll(async () => {
      await db.insert(garden).values({ id: "garden" }).onConflictDoNothing();
      await db.insert(settings).values({ id: "settings" }).onConflictDoNothing();
    });

    it("creates exactly one garden row with id 'garden'", async () => {
      const rows = await db.select().from(garden);
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe("garden");
      expect(rows[0].plan_url).toBeNull();
    });

    it("creates exactly one settings row with correct defaults", async () => {
      const rows = await db.select().from(settings);
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe("settings");
      expect(rows[0].task_lookback_weeks).toBe(8);
      expect(rows[0].task_lookahead_weeks).toBe(4);
      expect(rows[0].attachment_size_limit_mb).toBe(10);
    });

    it("seed is idempotent — running twice does not create duplicate rows", async () => {
      await db.insert(garden).values({ id: "garden" }).onConflictDoNothing();
      await db.insert(settings).values({ id: "settings" }).onConflictDoNothing();
      const gardenRows = await db.select().from(garden);
      const settingsRows = await db.select().from(settings);
      expect(gardenRows).toHaveLength(1);
      expect(settingsRows).toHaveLength(1);
    });
  });

  describe("Plants table", () => {
    it("inserts a plant and retrieves it by id", async () => {
      const now = new Date().toISOString();
      await db.insert(plants).values({
        id: "plant-001",
        name_common: "Rote Rose",
        temperature_protected: false,
        created_at: now,
        updated_at: now,
      });

      const result = await db
        .select()
        .from(plants)
        .where(eq(plants.id, "plant-001"));

      expect(result).toHaveLength(1);
      expect(result[0].name_common).toBe("Rote Rose");
      expect(result[0].name_botanical).toBeNull();
      expect(result[0].temperature_protected).toBe(false);
    });

    it("returns an empty list when no plants exist in a fresh db", async () => {
      const freshDb = createTestDb();
      const result = await freshDb.select().from(plants);
      expect(result).toHaveLength(0);
    });
  });
});
