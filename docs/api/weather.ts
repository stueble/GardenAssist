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
  /** 5-day forecast (today + 4 more days) */
  forecast:             WeatherDay[];
}
