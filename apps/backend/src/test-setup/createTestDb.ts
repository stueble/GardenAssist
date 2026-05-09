/**
 * createTestDb — shared helper for backend tests that need a real DB.
 *
 * Creates a fresh in-memory SQLite database, runs all migrations, and
 * inserts the two required singleton rows (garden, settings).
 *
 * Usage in test files:
 *   import { createTestDb } from "../test-setup/createTestDb.js";
 *   vi.mock("../db/index.js", () => ({ db: createTestDb() }));
 */

import { resolve } from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "../db/schema.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, "../../drizzle");

export function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  db.insert(schema.garden)
    .values({ id: "garden" })
    .onConflictDoNothing()
    .run();
  db.insert(schema.settings)
    .values({ id: "settings", language: "de" })
    .onConflictDoNothing()
    .run();
  return db;
}
