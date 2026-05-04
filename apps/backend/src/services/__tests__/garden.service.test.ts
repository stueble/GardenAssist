/**
 * getGarden integration tests.
 *
 * Uses an in-memory SQLite database with real migrations applied.
 * Verifies that getGarden() assembles the Garden object correctly from
 * normalized DB rows — including plants, positions, schedules, journal
 * entries, attachments, and derived tasks.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import Database from "better-sqlite3";
import { resolve } from "path";
import { fileURLToPath } from "url";
import * as schema from "../../db/schema.js";
import { garden, settings, plants, schedules, journalEntries, plantPositions, attachments } from "../../db/schema.js";
import { getGarden } from "../garden.service.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, "../../../drizzle");

function createTestDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  // Seed singletons
  db.insert(garden).values({ id: "garden" }).onConflictDoNothing().run();
  db.insert(settings).values({ id: "settings", language: "de" }).onConflictDoNothing().run();
  return db;
}

const NOW = new Date("2026-05-05T12:00:00Z"); // 2026-W19

describe("getGarden()", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
  });

  it("returns an empty garden when no plants exist", async () => {
    const result = await getGarden(db as any);
    expect(result.plants).toHaveLength(0);
    expect(result.journal_entries).toHaveLength(0);
    expect(result.attachments).toHaveLength(0);
    expect(result.plan_url).toBeNull();
  });

  it("returns garden plan metadata", async () => {
    db.update(schema.garden)
      .set({ plan_url: "/static/garden/plan.jpg", plan_name: "Mein Garten" })
      .where(eq(schema.garden.id, "garden"))
      .run();

    const result = await getGarden(db as any);
    expect(result.plan_url).toBe("/static/garden/plan.jpg");
    expect(result.plan_name).toBe("Mein Garten");
  });

  it("returns a plant with positions and schedules", async () => {
    const now = new Date().toISOString();
    db.insert(plants).values({
      id: "p1", name_common: "Rote Rose", temperature_protected: false,
      created_at: now, updated_at: now,
    }).run();

    db.insert(plantPositions).values({
      id: "pos1", plant_id: "p1", x_percent: 30, y_percent: 50,
    }).run();

    db.insert(schedules).values({
      id: "s1", plant_id: "p1", schedule_type: "pruning",
      start_week: 19, end_week: 19,
      created_at: now, updated_at: now,
    }).run();

    const result = await getGarden(db as any);

    expect(result.plants).toHaveLength(1);
    const plant = result.plants[0];
    expect(plant.name_common).toBe("Rote Rose");
    expect(plant.positions).toHaveLength(1);
    expect(plant.positions[0].x_percent).toBe(30);
    expect(plant.schedules).toHaveLength(1);
    expect(plant.schedules[0].schedule_type).toBe("pruning");
  });

  it("derives tasks from schedules", async () => {
    const now = new Date().toISOString();
    db.insert(plants).values({
      id: "p1", name_common: "Rose", temperature_protected: false,
      created_at: now, updated_at: now,
    }).run();

    db.insert(schedules).values({
      id: "s1", plant_id: "p1", schedule_type: "pruning",
      start_week: 19, end_week: 19,
      created_at: now, updated_at: now,
    }).run();

    // Update settings to use a known window
    db.update(schema.settings)
      .set({ task_lookback_weeks: 2, task_lookahead_weeks: 2 })
      .run();

    const result = await getGarden(db as any);
    const plant = result.plants[0];

    // W19 should be in the window (current week is W19 around May 5 2026)
    expect(plant.tasks.length).toBeGreaterThan(0);
    const w19Task = plant.tasks.find((t) => t.week === "2026-W19");
    expect(w19Task).toBeDefined();
  });

  it("does not include resolved tasks (done journal entry)", async () => {
    const now = new Date().toISOString();
    db.insert(plants).values({
      id: "p1", name_common: "Rose", temperature_protected: false,
      created_at: now, updated_at: now,
    }).run();

    db.insert(schedules).values({
      id: "s1", plant_id: "p1", schedule_type: "pruning",
      start_week: 19, end_week: 19,
      created_at: now, updated_at: now,
    }).run();

    db.insert(journalEntries).values({
      id: "je1", plant_id: "p1", schedule_id: "s1", week: "2026-W19",
      entry_type: "done", date: "2026-05-05",
      created_at: now, updated_at: now,
    }).run();

    db.update(schema.settings)
      .set({ task_lookback_weeks: 2, task_lookahead_weeks: 2 })
      .run();

    const result = await getGarden(db as any);
    const plant = result.plants[0];
    const w19Task = plant.tasks.find((t) => t.week === "2026-W19");
    expect(w19Task).toBeUndefined();
  });

  it("includes journal entries in the plant and in Garden.journal_entries", async () => {
    const now = new Date().toISOString();
    db.insert(plants).values({
      id: "p1", name_common: "Rose", temperature_protected: false,
      created_at: now, updated_at: now,
    }).run();

    db.insert(journalEntries).values({
      id: "je1", plant_id: "p1", entry_type: "manual",
      date: "2026-05-05", created_at: now, updated_at: now,
    }).run();

    const result = await getGarden(db as any);
    expect(result.plants[0].journal_entries).toHaveLength(1);
    expect(result.journal_entries).toHaveLength(1);
    expect(result.journal_entries[0].id).toBe("je1");
  });

  it("includes garden-wide attachments in Garden.attachments", async () => {
    const now = new Date().toISOString();
    db.insert(attachments).values({
      id: "att1", owner_type: "garden", owner_id: null, attachment_type: "image",
      url: "/static/garden/plan.jpg", created_at: now, updated_at: now,
    }).run();

    const result = await getGarden(db as any);
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0].id).toBe("att1");
  });

  it("response shape matches Garden type (has required fields)", async () => {
    const result = await getGarden(db as any);
    expect(result).toHaveProperty("plan_url");
    expect(result).toHaveProperty("plan_name");
    expect(result).toHaveProperty("plants");
    expect(result).toHaveProperty("journal_entries");
    expect(result).toHaveProperty("attachments");
    expect(Array.isArray(result.plants)).toBe(true);
    expect(Array.isArray(result.journal_entries)).toBe(true);
    expect(Array.isArray(result.attachments)).toBe(true);
  });
});
