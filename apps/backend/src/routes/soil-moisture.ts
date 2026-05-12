/**
 * Soil moisture route — TASK-073
 *
 * GET /api/soil-moisture
 *
 * Geocodes location_city from Settings via the shared geocoding helper,
 * then runs the FAO-56 water balance calculation for all configured irrigation zones.
 *
 * Responses:
 *   200 — SoilMoistureData JSON
 *   204 — No location configured in Settings
 *   422 — City name cannot be geocoded (not found)
 *   502 — Upstream fetch error
 */

import { Hono } from "hono";
import { db } from "../db/index.js";
import { getSettings } from "../services/settings.service.js";
import { geocodeCity } from "../utils/geocoding.js";
import { fetchSoilMoisture } from "../services/soil-moisture.service.js";

export const soilMoistureRoutes = new Hono();

soilMoistureRoutes.get("/", async (c) => {
  const settings = getSettings(db);
  const city     = settings.location_city;

  if (!city) {
    return c.body(null, 204);
  }

  try {
    const coords = await geocodeCity(city);

    if (!coords) {
      return c.json({ error: `City not found: ${city}` }, 422);
    }

    const data = await fetchSoilMoisture(db, coords.lat, coords.lon);

    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Soil moisture fetch failed: ${message}` }, 502);
  }
});
