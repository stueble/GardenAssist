import { serve } from "@hono/node-server";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import app from "./index.js";
import { db } from "./db/index.js";
import { seed } from "./db/seed.js";

const PORT = Number(process.env.PORT ?? 3000);

// Run migrations then seed before accepting traffic.
// seed() is idempotent — safe to call on every startup.
migrate(db, { migrationsFolder: "./drizzle" });
await seed();

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`GardenAssist backend running on http://localhost:${PORT}`);
});
