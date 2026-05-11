import { serve } from "@hono/node-server";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import app from "./index.js";
import { db } from "./db/index.js";

const PORT = Number(process.env.PORT ?? 3000);

// Run migrations before starting the server so the DB schema is always up to date.
migrate(db, { migrationsFolder: "./drizzle" });

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`GardenAssist backend running on http://localhost:${PORT}`);
});
