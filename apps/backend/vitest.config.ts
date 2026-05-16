import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      // Mirror the @api/* path alias from tsconfig.json so vitest can resolve
      // imports like "@api/plant.js" when running .ts test files directly.
      "@api": resolve(__dirname, "../../docs/api"),
    },
  },
  test: {
    // Run test files directly from src/ (TypeScript) so that __dirname in each
    // test file points to the source location. This ensures that relative paths
    // to the drizzle/ migrations folder (e.g. "../../../drizzle") resolve
    // correctly to apps/backend/drizzle/ instead of the deeply nested dist/ path
    // produced by tsc's rootDir:"../.." setting.
    include: ["src/**/*.test.ts"],

    // Fallback safety net: if any test file imports db/index.ts without a mock,
    // use an in-memory SQLite so the production gardenassist.db is never opened.
    // Route tests that need a real DB use vi.mock("../db/index.js") directly with
    // createTestDb() to get a migrated in-memory database.
    env: {
      DATABASE_URL: "file::memory:",
    },
  },
});
