---
id: decision-011
title: ADR-011 - Open-Meteo Weather Integration
date: '2026-05-12'
status: Accepted
---

## Context

The Dashboard weather widget was initially implemented as a stub with hardcoded
placeholder data (TASK-031). The configured location (city + zip) is already stored
in Settings. A real weather data source was needed that satisfies the following
constraints:

- **No API key required** — the app is designed for on-premise, zero-dependency
  installation (see ADR-004); requiring users to register for a weather API account
  would contradict this principle
- **Free and open** — no cost for self-hosted, personal use
- **Reliable and accurate** — professional-grade forecast data, not hobbyist feeds
- **No additional infrastructure** — the backend must be the sole caller; no
  client-side API calls that would expose keys or CORS issues

Options considered:

| Service | API key required | Free tier | Notes |
|---|---|---|---|
| Open-Meteo | ❌ No | ✅ Unlimited | WMO-compliant, open-source model |
| OpenWeatherMap | ✅ Yes | Limited (60 calls/min) | Registration required |
| WeatherAPI | ✅ Yes | Limited (1M calls/month) | Registration required |
| Bright Sky (DWD) | ❌ No | ✅ Unlimited | Germany only |
| wttr.in | ❌ No | ✅ Unlimited | Unstable API, no SLA |

## Decision

Weather data is sourced from **Open-Meteo** (https://open-meteo.com), a free and
open-source weather API that requires no registration or API key.

Two Open-Meteo APIs are used in sequence by the backend:

1. **Geocoding API** (`https://geocoding-api.open-meteo.com/v1/search`)
   Converts the `location_city` setting to latitude/longitude coordinates.

2. **Forecast API** (`https://api.open-meteo.com/v1/forecast`)
   Fetches current conditions and a 5-day forecast using the geocoded coordinates.

The backend exposes a new `GET /api/weather` endpoint. All Open-Meteo calls happen
server-side — the frontend never contacts Open-Meteo directly.

### Response fields

**Current conditions:**
- Temperature (°C)
- WMO weather code (mapped to emoji + label in the frontend)
- Precipitation (mm)
- Wind speed (km/h)

**5-day forecast (per day):**
- Date (ISO 8601)
- WMO weather code
- Max/min temperature (°C)
- Precipitation sum (mm)

### Error handling

| Condition | HTTP status |
|---|---|
| No `location_city` configured in Settings | 204 No Content |
| City name not found in geocoding API | 422 Unprocessable Entity |
| Upstream Open-Meteo API error | 502 Bad Gateway |

### Weather refresh

The frontend polls `/api/weather` once per hour (singleton pattern) to keep the
widget up-to-date without unnecessary requests. The first fetch happens immediately
on Dashboard load.

## Consequences

- No API key management, registration, or billing is required.
- The weather feature works out of the box for any self-hosted install.
- Open-Meteo is not an official meteorological service — forecast accuracy is
  comparable to commercial providers for most use cases but carries no SLA.
- If Open-Meteo changes its API or introduces rate limits, the integration must
  be updated; however, Open-Meteo has committed to keeping the free tier for
  non-commercial use.
- Weather data is only available when the host has outbound internet access.
  This is the only exception to the offline-first principle (ADR-004) in v1,
  alongside AI assistant requests (ADR-001).
- The city name must be recognizable by Open-Meteo's geocoding service — very
  small localities may not resolve. The 422 response prompts the user to check
  their Settings.
- WMO weather codes are mapped to human-readable labels and emoji icons in both
  German and English via the i18n system.
- The soil moisture / water balance extension (TASK-073) will reuse the same
  Open-Meteo integration (Archive + Forecast APIs) for its calculations.
