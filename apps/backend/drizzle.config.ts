import { defineConfig } from "drizzle-kit";

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./gardenassist.db";
const isSQLite = DATABASE_URL.startsWith("file:");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: isSQLite ? "sqlite" : "postgresql",
  dbCredentials: isSQLite
    ? { url: DATABASE_URL }
    : { url: DATABASE_URL },
});
