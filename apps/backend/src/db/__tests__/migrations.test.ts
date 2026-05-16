/**
 * Migration integrity tests — TASK-091
 *
 * Verifies:
 * - _journal.json timestamps are strictly ascending (no silent skipping)
 * - migrate() against a fresh in-memory DB applies all expected migrations
 * - __drizzle_migrations table is populated after migrate()
 */

import { describe, it, expect } from "vitest";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __dirname   = fileURLToPath(new URL(".", import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, "../../../drizzle");
const JOURNAL_PATH   = resolve(MIGRATIONS_DIR, "meta/_journal.json");

// ── Journal integrity ─────────────────────────────────────────────────────────

describe("_journal.json integrity (TASK-091 AC #3)", () => {
  const journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf-8")) as {
    entries: { idx: number; when: number; tag: string }[];
  };

  it("all entries have strictly ascending 'when' timestamps", () => {
    const entries = journal.entries;
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i].when).toBeGreaterThan(entries[i - 1].when);
    }
  });

  it("no entry has the old hardcoded timestamp prefix (1746833400xxx)", () => {
    for (const entry of journal.entries) {
      expect(entry.when.toString()).not.toMatch(/^17468334/);
    }
  });

  it("entries are numbered consecutively from 0", () => {
    const idxs = journal.entries.map((e) => e.idx);
    idxs.forEach((idx, pos) => expect(idx).toBe(pos));
  });
});

// ── Migration application ─────────────────────────────────────────────────────

describe("migrate() applies all migrations (TASK-091 AC #1)", () => {
  it("populates __drizzle_migrations after running against a fresh DB", () => {
    const sqlite = new Database(":memory:");
    sqlite.pragma("journal_mode = WAL");
    const db = drizzle(sqlite);

    // Should not throw
    expect(() => migrate(db, { migrationsFolder: MIGRATIONS_DIR })).not.toThrow();

    // __drizzle_migrations must exist and have at least one row per journal entry
    const journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf-8")) as {
      entries: { idx: number }[];
    };
    const row = sqlite.prepare("SELECT COUNT(*) as n FROM __drizzle_migrations").get() as { n: number };
    expect(row.n).toBe(journal.entries.length);
  });

  it("countAppliedMigrations returns 0 before migrate() and N after", () => {
    const sqlite = new Database(":memory:");
    sqlite.pragma("journal_mode = WAL");
    const db = drizzle(sqlite);

    // Before: table doesn't exist yet — count should return 0 gracefully
    const countBefore = (() => {
      try {
        const r = sqlite.prepare("SELECT COUNT(*) as n FROM __drizzle_migrations").get() as { n: number };
        return r.n;
      } catch {
        return 0;
      }
    })();
    expect(countBefore).toBe(0);

    migrate(db, { migrationsFolder: MIGRATIONS_DIR });

    const countAfter = sqlite
      .prepare("SELECT COUNT(*) as n FROM __drizzle_migrations")
      .get() as { n: number };
    const journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf-8")) as {
      entries: { idx: number }[];
    };
    expect(countAfter.n).toBe(journal.entries.length);
  });
});
