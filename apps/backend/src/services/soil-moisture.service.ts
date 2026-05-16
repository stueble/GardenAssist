/**
 * Soil Moisture Water Balance Service — TASK-073
 *
 * Implements a daily FAO-56 water balance model per irrigation zone.
 *
 * Algorithm overview:
 *   1. Fetch soil_moisture_3_to_9cm baseline (14 days ago) from Open-Meteo Forecast API.
 *   2. Fetch daily precipitation_sum and et0_fao_evapotranspiration for the last 14 days
 *      by combining the Open-Meteo Archive API (T-14 to T-3) and Forecast API (T-2 to T).
 *   3. Read irrigation journal entries (entry_type = "irrigation") for the last 14 days.
 *      title = zone name, notes = applied mm as numeric string.
 *   4. Per zone: run the daily water balance loop and derive moisture history + status.
 *
 * Field capacity is derived per zone from the modal soil_type of the zone's plants
 * (see ADR-012). Status thresholds: dry <35 %, ok 35–75 %, wet >75 % of field capacity.
 */

import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { and, eq, gte, lte } from "drizzle-orm";
import * as schema from "../db/schema.js";
import { getSettings } from "./settings.service.js";
import type { SoilMoistureData, SoilMoistureDay, SoilMoistureStatus, SoilMoistureZone } from "@api/weather.js";

type Db = BetterSQLite3Database<typeof schema>;

// ── Open-Meteo API URLs ───────────────────────────────────────────────────────

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL  = "https://archive-api.open-meteo.com/v1/archive";

// ── Field capacity lookup (ADR-012) ───────────────────────────────────────────

const FIELD_CAPACITY: Record<string, number> = {
  loamy:      0.30,
  sandy:      0.20,
  humus_rich: 0.35,
  calcareous: 0.25,
  acidic:     0.28,
};

const FIELD_CAPACITY_FALLBACK = 0.30;

// ── Status thresholds (fraction of field capacity) ────────────────────────────

const WET_THRESHOLD = 0.75;

// ── Open-Meteo response types ─────────────────────────────────────────────────

interface ArchiveResponse {
  daily: {
    time:                       string[];
    precipitation_sum:          (number | null)[];
    et0_fao_evapotranspiration: (number | null)[];
  };
}

interface ForecastDailyResponse {
  daily: {
    time:                       string[];
    precipitation_sum:          (number | null)[];
    et0_fao_evapotranspiration: (number | null)[];
  };
}

// soil_moisture_3_to_9cm is only available as an hourly variable in the
// Forecast API — not as a daily variable. We fetch it separately and
// compute the daily mean for use as the T-14 baseline.
interface ForecastHourlyResponse {
  hourly: {
    time:                   string[];   // ISO datetime strings "2026-05-01T00:00"
    soil_moisture_3_to_9cm: (number | null)[];
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format a Date as YYYY-MM-DD in local time. */
function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Add `days` calendar days to a Date. */
function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}

/** Clamp a value to [min, max]. */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Derive field capacity for a zone from the modal soil_type of its plants.
 * Tie-breaks towards higher capacity (conservative). Falls back to 0.30.
 */
export function fieldCapacityForZone(
  zoneName: string,
  plants: Array<{ watering_zone: string | null; soil_type: string | null }>,
): number {
  const zonePlants = plants.filter((p) => p.watering_zone === zoneName);
  if (zonePlants.length === 0) return FIELD_CAPACITY_FALLBACK;

  // Count soil type frequencies
  const freq = new Map<string, number>();
  for (const p of zonePlants) {
    if (!p.soil_type) continue;
    freq.set(p.soil_type, (freq.get(p.soil_type) ?? 0) + 1);
  }
  if (freq.size === 0) return FIELD_CAPACITY_FALLBACK;

  // Find the modal soil type; prefer higher FC on tie
  let bestType = "";
  let bestCount = -1;
  let bestFc = -1;
  for (const [soilType, count] of freq) {
    const fc = FIELD_CAPACITY[soilType] ?? FIELD_CAPACITY_FALLBACK;
    if (count > bestCount || (count === bestCount && fc > bestFc)) {
      bestType  = soilType;
      bestCount = count;
      bestFc    = fc;
    }
  }

  return FIELD_CAPACITY[bestType] ?? FIELD_CAPACITY_FALLBACK;
}

/** Derive SoilMoistureStatus from moisture fraction (0–1). */
export function moistureStatus(fraction: number, dryThreshold = 0.35): SoilMoistureStatus {
  if (fraction < dryThreshold) return "dry";
  if (fraction > WET_THRESHOLD) return "wet";
  return "ok";
}

// ── Main service function ─────────────────────────────────────────────────────

/**
 * Calculate the 14-day FAO-56 water balance for every configured irrigation zone.
 *
 * @param db  - Drizzle DB instance
 * @param lat - Latitude (from geocoding)
 * @param lon - Longitude (from geocoding)
 */
export async function fetchSoilMoisture(db: Db, lat: number, lon: number): Promise<SoilMoistureData> {
  const settings = getSettings(db);
  const zones    = settings.irrigation_zones;

  if (zones.length === 0) {
    return { zones: [] };
  }

  // ── Date range ─────────────────────────────────────────────────────────────

  const today  = new Date(Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
  ));
  const t14    = addDays(today, -14);  // baseline day (inclusive)
  const t3     = addDays(today, -3);   // last reliable archive day
  const t2     = addDays(today, -2);   // first forecast-covered day

  const startDate = toIsoDate(t14);
  const endDate   = toIsoDate(today);

  // ── Fetch Open-Meteo Archive (T-14 to T-3) ────────────────────────────────

  const archiveParams = new URLSearchParams({
    latitude:  String(lat),
    longitude: String(lon),
    start_date: startDate,
    end_date:   toIsoDate(t3),
    daily:     "precipitation_sum,et0_fao_evapotranspiration",
    timezone:  "UTC",
  });

  const archiveRes = await fetch(`${ARCHIVE_URL}?${archiveParams}`);
  if (!archiveRes.ok) {
    throw new Error(`Archive API error: ${archiveRes.status}`);
  }
  const archiveData = await archiveRes.json() as ArchiveResponse;

  // ── Fetch Open-Meteo Forecast daily (T-2 to T) and hourly soil moisture ─────
  // Two parallel requests:
  //   1. Daily precip + ET0 for the recent days not yet in the archive
  //   2. Hourly soil_moisture_3_to_9cm for T-14 (baseline) — daily not available

  const forecastDailyParams = new URLSearchParams({
    latitude:      String(lat),
    longitude:     String(lon),
    daily:         "precipitation_sum,et0_fao_evapotranspiration",
    past_days:     "3",
    forecast_days: "1",
    timezone:      "UTC",
  });

  const forecastHourlyParams = new URLSearchParams({
    latitude:      String(lat),
    longitude:     String(lon),
    hourly:        "soil_moisture_3_to_9cm",
    past_days:     "14",
    forecast_days: "0",
    timezone:      "UTC",
  });

  const [forecastDailyRes, forecastHourlyRes] = await Promise.all([
    fetch(`${FORECAST_URL}?${forecastDailyParams}`),
    fetch(`${FORECAST_URL}?${forecastHourlyParams}`),
  ]);

  if (!forecastDailyRes.ok) {
    throw new Error(`Forecast API error: ${forecastDailyRes.status}`);
  }
  if (!forecastHourlyRes.ok) {
    throw new Error(`Forecast API error: ${forecastHourlyRes.status}`);
  }

  const forecastDailyData  = await forecastDailyRes.json()  as ForecastDailyResponse;
  const forecastHourlyData = await forecastHourlyRes.json() as ForecastHourlyResponse;

  // ── Build unified daily arrays indexed by date string ─────────────────────

  const precipByDate = new Map<string, number>();
  const et0ByDate    = new Map<string, number>();

  // Archive data (T-14 to T-3)
  for (let i = 0; i < archiveData.daily.time.length; i++) {
    const date = archiveData.daily.time[i];
    precipByDate.set(date, archiveData.daily.precipitation_sum[i] ?? 0);
    et0ByDate.set(date,    archiveData.daily.et0_fao_evapotranspiration[i] ?? 0);
  }

  // Forecast daily fills T-2, T-1, T (overwrites archive if overlap)
  for (let i = 0; i < forecastDailyData.daily.time.length; i++) {
    const date = forecastDailyData.daily.time[i];
    if (date >= toIsoDate(t2)) {
      precipByDate.set(date, forecastDailyData.daily.precipitation_sum[i] ?? 0);
      et0ByDate.set(date,    forecastDailyData.daily.et0_fao_evapotranspiration[i] ?? 0);
    }
  }

  // Baseline soil moisture: mean of hourly values on the T-14 date
  const baselineSoilMoisture: number = (() => {
    const hourlyTimes  = forecastHourlyData.hourly.time;
    const hourlyValues = forecastHourlyData.hourly.soil_moisture_3_to_9cm;
    const dayValues    = hourlyValues.filter((_, i) => hourlyTimes[i]?.startsWith(startDate) && hourlyValues[i] !== null) as number[];
    if (dayValues.length === 0) return 0.20;
    return dayValues.reduce((a, b) => a + b, 0) / dayValues.length;
  })();

  // ── Build ordered 14-day date list (T-14 … T) ────────────────────────────

  const dates: string[] = [];
  for (let i = 0; i <= 14; i++) {
    dates.push(toIsoDate(addDays(t14, i)));
  }
  // We want 14 days of loop output (days 1..14, using day 0 only as baseline)
  // dates[0] = T-14 (baseline), dates[1..14] = output days

  // ── Read irrigation journal entries for the date range ────────────────────

  const irrigationEntries = db
    .select({
      date:  schema.journalEntries.date,
      title: schema.journalEntries.title,   // zone name
      notes: schema.journalEntries.notes,   // mm as numeric string
    })
    .from(schema.journalEntries)
    .where(
      and(
        eq(schema.journalEntries.entry_type, "irrigation"),
        gte(schema.journalEntries.date, startDate),
        lte(schema.journalEntries.date, endDate),
      ),
    )
    .all();

  // Build map: date → zone → total mm
  const irrigationByDateZone = new Map<string, Map<string, number>>();
  for (const entry of irrigationEntries) {
    if (!entry.date || !entry.title) continue;
    const mm = parseFloat(entry.notes ?? "0");
    if (isNaN(mm) || mm <= 0) continue;
    if (!irrigationByDateZone.has(entry.date)) {
      irrigationByDateZone.set(entry.date, new Map());
    }
    const zoneMap = irrigationByDateZone.get(entry.date)!;
    zoneMap.set(entry.title, (zoneMap.get(entry.title) ?? 0) + mm);
  }

  // ── Load plant soil_type data for field capacity derivation ───────────────

  const allPlants = db
    .select({ watering_zone: schema.plants.watering_zone, soil_type: schema.plants.soil_type })
    .from(schema.plants)
    .all();

  // ── Run FAO-56 water balance per zone ─────────────────────────────────────

  const zoneResults: SoilMoistureZone[] = zones.map((zoneName) => {
    const fc = fieldCapacityForZone(zoneName, allPlants);

    // moisture[0] = baseline (T-14), already in m³/m³
    let moisture = clamp(baselineSoilMoisture, 0, fc);

    const history: SoilMoistureDay[] = [];

    // Loop days T-14+1 … T (14 iterations, indices 1..14 in dates[])
    for (let i = 1; i < dates.length; i++) {
      const date   = dates[i];
      const precip = precipByDate.get(date) ?? 0;   // mm
      const et0    = et0ByDate.get(date)    ?? 0;   // mm
      const irr    = irrigationByDateZone.get(date)?.get(zoneName) ?? 0; // mm

      // Convert mm → m³/m³ (dividing by 1000 converts mm depth to m, which
      // is numerically equivalent to m³/m² = m³/m³ for a 1 m reference depth)
      moisture = clamp(moisture + (precip - et0 + irr) / 1000, 0, fc);

      const pct = Math.round((moisture / fc) * 1000) / 10; // one decimal place
      history.push({ date, moisture: pct });
    }

    const current      = history[history.length - 1]?.moisture ?? 0;
    const dryThreshold = (settings.soil_moisture_dry_threshold_pct / 100);
    const status       = moistureStatus(current / 100, dryThreshold);

    return {
      zone:           zoneName,
      history,
      current,
      status,
      field_capacity: fc,
    };
  });

  return { zones: zoneResults };
}
