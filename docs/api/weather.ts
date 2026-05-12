/**
 * Weather API types — TASK-070
 *
 * Response shape for GET /api/weather.
 * Data sourced from Open-Meteo (free, no API key required).
 */

/** A single day in the 5-day forecast. */
export interface WeatherDay {
  /** ISO date string, e.g. "2026-05-11" */
  date:            string;
  /** WMO weather code — maps to icon + label on the frontend */
  weather_code:    number;
  /** Maximum temperature in °C */
  temp_max:        number;
  /** Minimum temperature in °C */
  temp_min:        number;
  /** Total precipitation in mm */
  precipitation:   number;
}

/** Response body for GET /api/weather (HTTP 200). */
export interface WeatherData {
  /** City name as configured in Settings */
  city:                 string;
  /** Current temperature in °C */
  current_temp:         number;
  /** WMO weather code for current conditions */
  current_weather_code: number;
  /** Current precipitation in mm */
  current_precipitation: number;
  /** Current wind speed in km/h */
  current_wind_kmh:     number;
  /** 5-day forecast (today + 4 more days) */
  forecast:             WeatherDay[];
}

// ── Soil Moisture (TASK-073) ──────────────────────────────────────────────────

/** Moisture status derived from the FAO-56 water balance relative to field capacity. */
export type SoilMoistureStatus = "dry" | "ok" | "wet";

/** Soil moisture for a single day in the 14-day history. */
export interface SoilMoistureDay {
  /** ISO date string, e.g. "2026-05-01" */
  date:     string;
  /**
   * Volumetric water content expressed as a percentage of field capacity,
   * rounded to one decimal place. Range: 0–100.
   */
  moisture: number;
}

/** Soil moisture result for a single irrigation zone. */
export interface SoilMoistureZone {
  /** Zone name, matches one of Settings.irrigation_zones */
  zone:           string;
  /** 14-day daily moisture history (oldest first) */
  history:        SoilMoistureDay[];
  /**
   * Current moisture as a percentage of field capacity (0–100).
   * Equals history[history.length - 1].moisture.
   */
  current:        number;
  /** Derived status: dry (<35 %), ok (35–75 %), wet (>75 %) */
  status:         SoilMoistureStatus;
  /**
   * Field capacity in m³/m³ used for this zone.
   * Derived from the modal soil_type of plants assigned to the zone
   * (see ADR-012). Included for informational / debugging purposes.
   */
  field_capacity: number;
}

/** Response body for GET /api/soil-moisture (HTTP 200). */
export interface SoilMoistureData {
  zones: SoilMoistureZone[];
}
