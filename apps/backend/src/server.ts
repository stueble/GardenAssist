import { serve } from "@hono/node-server";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import app from "./index.js";
import { db, client } from "./db/index.js";
import { seed } from "./db/seed.js";

const PORT = Number(process.env.PORT ?? 3000);

// ── Migrations ────────────────────────────────────────────────────────────────

/** Count rows in __drizzle_migrations; returns 0 if the table doesn't exist yet. */
function countAppliedMigrations(): number {
  try {
    const row = client.prepare("SELECT COUNT(*) as n FROM __drizzle_migrations").get() as { n: number };
    return row.n;
  } catch {
    return 0;
  }
}

try {
  const before = countAppliedMigrations();
  migrate(db, { migrationsFolder: "./drizzle" });
  const after   = countAppliedMigrations();
  const applied = after - before;

  if (applied > 0) {
    console.log(`Migrations: ${applied} applied (${after} total)`);
  } else {
    console.log(`Migrations: 0 applied (${after} total) — already up to date`);
  }
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
}

await seed();

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`GardenAssist backend running on http://localhost:${PORT}`);
});
