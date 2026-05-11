/**
 * Weather route tests — TASK-070
 *
 * GET /api/weather
 *
 * Uses Hono's app.request helper (no real HTTP server).
 * fetch is mocked via vi.stubGlobal to intercept Open-Meteo calls.
 * getSettings is mocked to control location_city.
 *
 * AC #4 — 204 when no location configured
 * AC #5 — 422 when city not found
 * AC #1/#2/#3 — 200 with WeatherData on success
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import app from "../../index.js";

// ── Mock settings ──────────────────────────────────────────────────────────────

vi.mock("../../services/settings.service.js", () => ({
  getSettings: vi.fn(),
}));

import { getSettings } from "../../services/settings.service.js";

function setCity(city: string | null) {
  (getSettings as ReturnType<typeof vi.fn>).mockReturnValue({
    language: "de", location_city: city, location_zip: null,
    irrigation_zones: [], plant_categories: [], color_presets: [],
    task_lookback_weeks: 8, task_lookahead_weeks: 4,
    attachment_size_limit_mb: 10,
    ai_provider: null, ai_model: null, ai_api_key: null,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockFetch(
  geocodingBody: unknown,
  forecastBody: unknown,
  geocodingOk = true,
  forecastOk  = true,
) {
  let callCount = 0;
  return vi.fn().mockImplementation(() => {
    callCount++;
    const isGeo = callCount === 1;
    const ok    = isGeo ? geocodingOk : forecastOk;
    const body  = isGeo ? geocodingBody : forecastBody;
    return Promise.resolve({
      ok,
      status:     ok ? 200 : 500,
      statusText: ok ? "OK" : "Internal Server Error",
      json:       () => Promise.resolve(body),
      text:       () => Promise.resolve(JSON.stringify(body)),
    });
  });
}

const GEOCODING_HIT = {
  results: [{ name: "Berlin", latitude: 52.52, longitude: 13.41, country: "Germany" }],
};

const GEOCODING_MISS = { results: [] };

const FORECAST_BODY = {
  current: {
    temperature_2m:  18.3,
    weather_code:    2,
    precipitation:   0.0,
    windspeed_10m:   12.4,
  },
  daily: {
    time:                ["2026-05-11","2026-05-12","2026-05-13","2026-05-14","2026-05-15"],
    weather_code:        [2, 3, 61, 0, 1],
    temperature_2m_max:  [20.1, 18.5, 15.0, 22.3, 21.0],
    temperature_2m_min:  [10.5,  9.0, 11.2, 12.4, 11.8],
    precipitation_sum:   [0.0,   0.5, 12.3,  0.0,  0.0],
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/weather — AC #4: no location configured", () => {
  it("returns 204 when location_city is null", async () => {
    setCity(null);
    const res = await app.request("/api/weather");
    expect(res.status).toBe(204);
  });

  it("returns no body on 204", async () => {
    setCity(null);
    const res = await app.request("/api/weather");
    const text = await res.text();
    expect(text).toBe("");
  });
});

describe("GET /api/weather — AC #5: city not found", () => {
  it("returns 422 when geocoding returns no results", async () => {
    setCity("Atlantis");
    vi.stubGlobal("fetch", mockFetch(GEOCODING_MISS, null));
    const res = await app.request("/api/weather");
    expect(res.status).toBe(422);
  });

  it("422 body contains error message with city name", async () => {
    setCity("Atlantis");
    vi.stubGlobal("fetch", mockFetch(GEOCODING_MISS, null));
    const res  = await app.request("/api/weather");
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/Atlantis/i);
  });
});

describe("GET /api/weather — AC #1/#2/#3: successful response", () => {
  it("returns 200 with WeatherData", async () => {
    setCity("Berlin");
    vi.stubGlobal("fetch", mockFetch(GEOCODING_HIT, FORECAST_BODY));
    const res = await app.request("/api/weather");
    expect(res.status).toBe(200);
  });

  it("response includes city name from settings", async () => {
    setCity("Berlin");
    vi.stubGlobal("fetch", mockFetch(GEOCODING_HIT, FORECAST_BODY));
    const res  = await app.request("/api/weather");
    const body = await res.json() as { city: string };
    expect(body.city).toBe("Berlin");
  });

  it("response includes current_temp rounded to 1 decimal", async () => {
    setCity("Berlin");
    vi.stubGlobal("fetch", mockFetch(GEOCODING_HIT, FORECAST_BODY));
    const res  = await app.request("/api/weather");
    const body = await res.json() as { current_temp: number };
    expect(body.current_temp).toBe(18.3);
  });

  it("response includes current_weather_code", async () => {
    setCity("Berlin");
    vi.stubGlobal("fetch", mockFetch(GEOCODING_HIT, FORECAST_BODY));
    const res  = await app.request("/api/weather");
    const body = await res.json() as { current_weather_code: number };
    expect(body.current_weather_code).toBe(2);
  });

  it("response includes current_precipitation", async () => {
    setCity("Berlin");
    vi.stubGlobal("fetch", mockFetch(GEOCODING_HIT, FORECAST_BODY));
    const res  = await app.request("/api/weather");
    const body = await res.json() as { current_precipitation: number };
    expect(body.current_precipitation).toBe(0.0);
  });

  it("response includes current_wind_kmh rounded to integer", async () => {
    setCity("Berlin");
    vi.stubGlobal("fetch", mockFetch(GEOCODING_HIT, FORECAST_BODY));
    const res  = await app.request("/api/weather");
    const body = await res.json() as { current_wind_kmh: number };
    expect(body.current_wind_kmh).toBe(12);
  });

  it("forecast has 5 entries", async () => {
    setCity("Berlin");
    vi.stubGlobal("fetch", mockFetch(GEOCODING_HIT, FORECAST_BODY));
    const res  = await app.request("/api/weather");
    const body = await res.json() as { forecast: unknown[] };
    expect(body.forecast).toHaveLength(5);
  });

  it("forecast entries contain date, weather_code, temp_max, temp_min, precipitation", async () => {
    setCity("Berlin");
    vi.stubGlobal("fetch", mockFetch(GEOCODING_HIT, FORECAST_BODY));
    const res  = await app.request("/api/weather");
    const body = await res.json() as {
      forecast: Array<{
        date: string; weather_code: number;
        temp_max: number; temp_min: number; precipitation: number;
      }>;
    };
    const first = body.forecast[0];
    expect(first.date).toBe("2026-05-11");
    expect(first.weather_code).toBe(2);
    expect(first.temp_max).toBe(20.1);
    expect(first.temp_min).toBe(10.5);
    expect(first.precipitation).toBe(0.0);
  });

  it("geocoding API is called with the configured city name", async () => {
    setCity("München");
    const fetchMock = mockFetch(GEOCODING_HIT, FORECAST_BODY);
    vi.stubGlobal("fetch", fetchMock);
    await app.request("/api/weather");
    const [firstUrl] = fetchMock.mock.calls[0] as [string];
    expect(firstUrl).toContain("M%C3%BCnchen");  // URL-encoded "München"
  });

  it("returns 502 when geocoding API call fails", async () => {
    setCity("Berlin");
    vi.stubGlobal("fetch", mockFetch(GEOCODING_HIT, FORECAST_BODY, false, true));
    const res = await app.request("/api/weather");
    expect(res.status).toBe(502);
  });

  it("returns 502 when forecast API call fails", async () => {
    setCity("Berlin");
    vi.stubGlobal("fetch", mockFetch(GEOCODING_HIT, FORECAST_BODY, true, false));
    const res = await app.request("/api/weather");
    expect(res.status).toBe(502);
  });
});
