import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Fallback safety net: if any test file imports db/index.ts without a mock,
    // use an in-memory SQLite so the production gardenassist.db is never opened.
    // Route tests that need a real DB use vi.mock("../db/index.js") directly with
    // createTestDb() to get a migrated in-memory database.
    env: {
      DATABASE_URL: "file::memory:",
    },
  },
});
