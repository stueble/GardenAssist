/**
 * Weather route — TASK-070
 *
 * GET /api/weather
 *
 * Geocodes location_city from Settings via Open-Meteo Geocoding API,
 * then fetches current conditions and a 5-day forecast from Open-Meteo Forecast API.
 *
 * Responses:
 *   200 — WeatherData JSON
 *   204 — No location configured in Settings
 *   422 — City name cannot be geocoded (not found)
 *   502 — Upstream fetch error
 */

import { Hono } from "hono";
import { db } from "../db/index.js";
import { getSettings } from "../services/settings.service.js";
import type { WeatherData, WeatherDay } from "@api/weather.js";

export const weatherRoutes = new Hono();

// ── Open-Meteo API URLs ───────────────────────────────────────────────────────

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL  = "https://api.open-meteo.com/v1/forecast";

// ── Types for Open-Meteo responses ────────────────────────────────────────────

interface GeocodingResult {
  results?: Array<{
    name:      string;
    latitude:  number;
    longitude: number;
    country?:  string;
  }>;
}

interface ForecastResponse {
  current: {
    temperature_2m:  number;
    weather_code:    number;
    precipitation:   number;
    windspeed_10m:   number;
  };
  daily: {
    time:                string[];
    weather_code:        number[];
    temperature_2m_max:  number[];
    temperature_2m_min:  number[];
    precipitation_sum:   number[];
  };
}

// ── Route ─────────────────────────────────────────────────────────────────────

weatherRoutes.get("/", async (c) => {
  const settings = getSettings(db);
  const city = settings.location_city;

  // AC #4 — no location configured
  if (!city) {
    return c.body(null, 204);
  }

  try {
    // AC #2 — geocode city name to lat/lon
    const geoRes = await fetch(
      `${GEOCODING_URL}?name=${encodeURIComponent(city)}&count=1&language=de&format=json`,
    );
    if (!geoRes.ok) {
      throw new Error(`Geocoding API error: ${geoRes.status}`);
    }

    const geoData = await geoRes.json() as GeocodingResult;

    // AC #5 — city not found
    if (!geoData.results || geoData.results.length === 0) {
      return c.json({ error: `City not found: ${city}` }, 422);
    }

    const { latitude, longitude } = geoData.results[0];

    // AC #3 — fetch current + 5-day forecast
    const params = new URLSearchParams({
      latitude:         String(latitude),
      longitude:        String(longitude),
      current:          "temperature_2m,weather_code,precipitation,windspeed_10m",
      daily:            "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
      forecast_days:    "5",
      timezone:         "auto",
    });

    const forecastRes = await fetch(`${FORECAST_URL}?${params}`);
    if (!forecastRes.ok) {
      throw new Error(`Forecast API error: ${forecastRes.status}`);
    }

    const forecast = await forecastRes.json() as ForecastResponse;

    const days: WeatherDay[] = forecast.daily.time.map((date, i) => ({
      date,
      weather_code:  forecast.daily.weather_code[i],
      temp_max:      Math.round(forecast.daily.temperature_2m_max[i] * 10) / 10,
      temp_min:      Math.round(forecast.daily.temperature_2m_min[i] * 10) / 10,
      precipitation: Math.round(forecast.daily.precipitation_sum[i] * 10) / 10,
    }));

    const response: WeatherData = {
      city,
      current_temp:          Math.round(forecast.current.temperature_2m * 10) / 10,
      current_weather_code:  forecast.current.weather_code,
      current_precipitation: Math.round(forecast.current.precipitation * 10) / 10,
      current_wind_kmh:      Math.round(forecast.current.windspeed_10m),
      forecast:              days,
    };

    return c.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Weather fetch failed: ${message}` }, 502);
  }
});
