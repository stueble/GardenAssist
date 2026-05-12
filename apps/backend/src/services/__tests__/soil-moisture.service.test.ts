/**
 * Soil Moisture Service tests — TASK-073
 *
 * Tests the pure helper functions directly (fieldCapacityForZone, moistureStatus)
 * and the full fetchSoilMoisture() integration using an in-memory SQLite DB and
 * mocked Open-Meteo responses.
 *
 * AC #1 — soil_moisture_3_to_9cm baseline from Forecast API
 * AC #2 — precipitation_sum and et0_fao_evapotranspiration from Archive + Forecast
 * AC #3 — irrigation journal entries per zone are included in the balance
 * AC #4 — water balance loop with clamping to [0, field_capacity]
 * AC #5 — typed service output with status enum
 * AC #6 — unit tests with mocked responses
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import { resolve } from "path";
import { fileURLToPath } from "url";
import * as schema from "../../db/schema.js";
import { fetchSoilMoisture, fieldCapacityForZone, moistureStatus } from "../soil-moisture.service.js";

const __dirname  = fileURLToPath(new URL(".", import.meta.url));
const MIGRATIONS = resolve(__dirname, "../../../drizzle");

// ── DB helpers ────────────────────────────────────────────────────────────────

function createTestDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS });
  // Seed singleton settings row with two irrigation zones
  db.insert(schema.settings).values({
    id:               "settings",
    language:         "de",
    location_city:    "Berlin",
    irrigation_zones: JSON.stringify(["Hochbeet", "Terrasse"]),
  }).onConflictDoNothing().run();
  return db;
}

// ── Open-Meteo mock builder ───────────────────────────────────────────────────

/**
 * Build a 15-entry daily time array starting from (today - 14 days), UTC.
 * Indices 0..14 represent T-14 .. T.
 */
function buildDateRange(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 14; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

const DATES = buildDateRange(); // T-14 … T (15 entries)

/** Archive response covers T-14 to T-3 (12 days). */
function makeArchiveBody(precip: number[] = Array(12).fill(2), et0: number[] = Array(12).fill(1)) {
  return {
    daily: {
      time:                       DATES.slice(0, 12),
      precipitation_sum:          precip,
      et0_fao_evapotranspiration: et0,
    },
  };
}

/** Forecast response covers T-14 to T (15 days) for past_days=14. */
function makeForecastBody(
  soilMoisture0 = 0.20,
  precip: number[] = Array(15).fill(2),
  et0: number[] = Array(15).fill(1),
) {
  return {
    daily: {
      time:                       DATES,
      precipitation_sum:          precip,
      et0_fao_evapotranspiration: et0,
      soil_moisture_3_to_9cm:     [soilMoisture0, ...Array(14).fill(0.20)],
    },
  };
}

/**
 * Mock global fetch so that:
 *   - First call  (Archive API)  → returns archiveBody
 *   - Second call (Forecast API) → returns forecastBody
 */
function mockFetch(archiveBody: unknown, forecastBody: unknown, archiveOk = true, forecastOk = true) {
  let callCount = 0;
  return vi.fn().mockImplementation(() => {
    callCount++;
    const isArchive = callCount === 1;
    const ok   = isArchive ? archiveOk : forecastOk;
    const body = isArchive ? archiveBody : forecastBody;
    return Promise.resolve({
      ok,
      status: ok ? 200 : 500,
      json:   () => Promise.resolve(body),
    });
  });
}

// ── Unit tests: fieldCapacityForZone ─────────────────────────────────────────

describe("fieldCapacityForZone()", () => {
  it("returns fallback 0.30 when no plants in zone", () => {
    expect(fieldCapacityForZone("Hochbeet", [])).toBe(0.30);
  });

  it("returns fallback 0.30 when all plants in zone have null soil_type", () => {
    const plants = [
      { watering_zone: "Hochbeet", soil_type: null },
      { watering_zone: "Hochbeet", soil_type: null },
    ];
    expect(fieldCapacityForZone("Hochbeet", plants)).toBe(0.30);
  });

  it("returns correct FC for loamy soil", () => {
    const plants = [{ watering_zone: "Hochbeet", soil_type: "loamy" }];
    expect(fieldCapacityForZone("Hochbeet", plants)).toBe(0.30);
  });

  it("returns correct FC for sandy soil", () => {
    const plants = [{ watering_zone: "Hochbeet", soil_type: "sandy" }];
    expect(fieldCapacityForZone("Hochbeet", plants)).toBe(0.20);
  });

  it("returns correct FC for humus_rich soil", () => {
    const plants = [{ watering_zone: "Hochbeet", soil_type: "humus_rich" }];
    expect(fieldCapacityForZone("Hochbeet", plants)).toBe(0.35);
  });

  it("picks modal soil type when multiple plants", () => {
    const plants = [
      { watering_zone: "Hochbeet", soil_type: "sandy" },
      { watering_zone: "Hochbeet", soil_type: "sandy" },
      { watering_zone: "Hochbeet", soil_type: "loamy" },
    ];
    expect(fieldCapacityForZone("Hochbeet", plants)).toBe(0.20); // sandy wins (2 vs 1)
  });

  it("on tie, picks the soil type with higher FC", () => {
    // loamy (0.30) ties with sandy (0.20) — loamy should win
    const plants = [
      { watering_zone: "Hochbeet", soil_type: "loamy" },
      { watering_zone: "Hochbeet", soil_type: "sandy" },
    ];
    expect(fieldCapacityForZone("Hochbeet", plants)).toBe(0.30);
  });

  it("ignores plants from other zones", () => {
    const plants = [
      { watering_zone: "Terrasse", soil_type: "sandy" },
      { watering_zone: "Hochbeet", soil_type: "humus_rich" },
    ];
    expect(fieldCapacityForZone("Hochbeet", plants)).toBe(0.35);
  });
});

// ── Unit tests: moistureStatus ────────────────────────────────────────────────

describe("moistureStatus()", () => {
  it("returns 'dry' below 35% threshold", () => {
    expect(moistureStatus(0.34)).toBe("dry");
    expect(moistureStatus(0)).toBe("dry");
  });

  it("returns 'ok' at 35%", () => {
    expect(moistureStatus(0.35)).toBe("ok");
  });

  it("returns 'ok' in middle range", () => {
    expect(moistureStatus(0.55)).toBe("ok");
  });

  it("returns 'ok' at 75%", () => {
    expect(moistureStatus(0.75)).toBe("ok");
  });

  it("returns 'wet' above 75%", () => {
    expect(moistureStatus(0.76)).toBe("wet");
    expect(moistureStatus(1.0)).toBe("wet");
  });
});

// ── Integration tests: fetchSoilMoisture ─────────────────────────────────────

describe("fetchSoilMoisture()", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns empty zones array when no irrigation zones are configured", async () => {
    const sqlite = new Database(":memory:");
    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: MIGRATIONS });
    db.insert(schema.settings).values({
      id: "settings", language: "de", irrigation_zones: "[]",
    }).onConflictDoNothing().run();

    const result = await fetchSoilMoisture(db, 52.52, 13.41);
    expect(result.zones).toHaveLength(0);
  });

  it("returns one zone entry per configured irrigation zone", async () => {
    const db = createTestDb();
    vi.stubGlobal("fetch", mockFetch(makeArchiveBody(), makeForecastBody()));
    const result = await fetchSoilMoisture(db, 52.52, 13.41);
    expect(result.zones).toHaveLength(2);
    expect(result.zones.map((z) => z.zone)).toEqual(["Hochbeet", "Terrasse"]);
  });

  it("history has exactly 14 entries per zone (AC #2)", async () => {
    const db = createTestDb();
    vi.stubGlobal("fetch", mockFetch(makeArchiveBody(), makeForecastBody()));
    const result = await fetchSoilMoisture(db, 52.52, 13.41);
    for (const zone of result.zones) {
      expect(zone.history).toHaveLength(14);
    }
  });

  it("history dates are ISO date strings in ascending order", async () => {
    const db = createTestDb();
    vi.stubGlobal("fetch", mockFetch(makeArchiveBody(), makeForecastBody()));
    const result = await fetchSoilMoisture(db, 52.52, 13.41);
    const { history } = result.zones[0];
    for (let i = 1; i < history.length; i++) {
      expect(history[i].date > history[i - 1].date).toBe(true);
    }
  });

  it("current equals last history entry moisture", async () => {
    const db = createTestDb();
    vi.stubGlobal("fetch", mockFetch(makeArchiveBody(), makeForecastBody()));
    const result = await fetchSoilMoisture(db, 52.52, 13.41);
    for (const zone of result.zones) {
      expect(zone.current).toBe(zone.history[zone.history.length - 1].moisture);
    }
  });

  it("field_capacity is exposed on each zone (AC #5)", async () => {
    const db = createTestDb();
    vi.stubGlobal("fetch", mockFetch(makeArchiveBody(), makeForecastBody()));
    const result = await fetchSoilMoisture(db, 52.52, 13.41);
    for (const zone of result.zones) {
      expect(typeof zone.field_capacity).toBe("number");
      expect(zone.field_capacity).toBeGreaterThan(0);
    }
  });

  it("status is one of dry / ok / wet (AC #5)", async () => {
    const db = createTestDb();
    vi.stubGlobal("fetch", mockFetch(makeArchiveBody(), makeForecastBody()));
    const result = await fetchSoilMoisture(db, 52.52, 13.41);
    for (const zone of result.zones) {
      expect(["dry", "ok", "wet"]).toContain(zone.status);
    }
  });

  it("moisture is clamped to 0 when ET0 >> precipitation (AC #4)", async () => {
    const db = createTestDb();
    // Very high ET0, zero precip → moisture should hit 0 and stay there
    const archive  = makeArchiveBody(Array(12).fill(0), Array(12).fill(10));
    const forecast = makeForecastBody(0.01, Array(15).fill(0), Array(15).fill(10));
    vi.stubGlobal("fetch", mockFetch(archive, forecast));
    const result = await fetchSoilMoisture(db, 52.52, 13.41);
    for (const zone of result.zones) {
      expect(zone.current).toBe(0);
      expect(zone.status).toBe("dry");
    }
  });

  it("moisture is clamped to 100% when precipitation >> ET0 (AC #4)", async () => {
    const db = createTestDb();
    // Very high precip → moisture should hit field capacity (100%)
    const archive  = makeArchiveBody(Array(12).fill(100), Array(12).fill(0));
    const forecast = makeForecastBody(0.30, Array(15).fill(100), Array(15).fill(0));
    vi.stubGlobal("fetch", mockFetch(archive, forecast));
    const result = await fetchSoilMoisture(db, 52.52, 13.41);
    for (const zone of result.zones) {
      expect(zone.current).toBe(100);
      expect(zone.status).toBe("wet");
    }
  });

  it("irrigation journal entries increase moisture for the matching zone (AC #3)", async () => {
    const db = createTestDb();

    // Baseline 0.20 m³/m³, precip = ET0 = 0 → without irrigation stays at 0.20
    const archive  = makeArchiveBody(Array(12).fill(0), Array(12).fill(0));
    const forecast = makeForecastBody(0.20, Array(15).fill(0), Array(15).fill(0));

    // Insert an irrigation entry for "Hochbeet" 7 days ago: 30 mm
    const today = new Date();
    const sevenDaysAgo = new Date(Date.UTC(
      today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 7,
    ));
    const irrigDate = sevenDaysAgo.toISOString().slice(0, 10);

    db.insert(schema.journalEntries).values({
      id:         "irr-001",
      plant_id:   null,
      schedule_id: null,
      week:       null,
      entry_type: "irrigation",
      date:       irrigDate,
      title:      "Hochbeet",  // zone name
      notes:      "30",        // 30 mm
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).run();

    vi.stubGlobal("fetch", mockFetch(archive, forecast));
    const result = await fetchSoilMoisture(db, 52.52, 13.41);

    const hochbeet  = result.zones.find((z) => z.zone === "Hochbeet")!;
    const terrasse  = result.zones.find((z) => z.zone === "Terrasse")!;

    // Hochbeet gets +30mm = +0.03 m³/m³ on that day; Terrasse does not
    // Both start at 0.20, fc = 0.30 → baseline % = 0.20/0.30*100 ≈ 66.7
    // After irrigation: (0.20+0.03)/0.30*100 = 76.7 → wet
    // Without irrigation: 0.20/0.30*100 = 66.7 → ok
    expect(hochbeet.current).toBeGreaterThan(terrasse.current);
    expect(terrasse.status).toBe("ok");
  });

  it("throws when Archive API returns non-ok status", async () => {
    const db = createTestDb();
    vi.stubGlobal("fetch", mockFetch(null, null, false, true));
    await expect(fetchSoilMoisture(db, 52.52, 13.41)).rejects.toThrow("Archive API error");
  });

  it("throws when Forecast API returns non-ok status", async () => {
    const db = createTestDb();
    vi.stubGlobal("fetch", mockFetch(makeArchiveBody(), null, true, false));
    await expect(fetchSoilMoisture(db, 52.52, 13.41)).rejects.toThrow("Forecast API error");
  });
});
