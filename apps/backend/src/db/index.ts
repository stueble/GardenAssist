import { drizzle as drizzleSQLite, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema.js";

// PostgreSQL is loaded dynamically to avoid import errors when better-sqlite3
// is used, since postgres-js and better-sqlite3 have incompatible type signatures.
const DATABASE_URL = process.env.DATABASE_URL ?? "file:./gardenassist.db";

async function createDb() {
  if (!DATABASE_URL.startsWith("file:")) {
    // PostgreSQL path — dynamic import keeps types clean
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    const client = postgres(DATABASE_URL);
    return drizzle(client, { schema });
  }

  const path = DATABASE_URL.slice("file:".length);
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzleSQLite(sqlite, { schema });
}

// Synchronous SQLite instance used at module level.
// For PostgreSQL, call createDb() and await the result.
function createSQLiteDb(): { db: BetterSQLite3Database<typeof schema>; client: InstanceType<typeof Database> } {
  const path = DATABASE_URL.startsWith("file:")
    ? DATABASE_URL.slice("file:".length)
    : "./gardenassist.db";
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return { db: drizzleSQLite(sqlite, { schema }), client: sqlite };
}

const _sqlite = DATABASE_URL.startsWith("file:")
  ? createSQLiteDb()
  : (() => { throw new Error("For PostgreSQL use createDb() (async)"); })();

/** Drizzle ORM instance — use this for all queries. */
export const db = _sqlite.db;

/** Raw better-sqlite3 client — use only where Drizzle does not expose the needed API (e.g. prepare()). */
export const client = _sqlite.client;

export { createDb };
export type Db = BetterSQLite3Database<typeof schema>;
