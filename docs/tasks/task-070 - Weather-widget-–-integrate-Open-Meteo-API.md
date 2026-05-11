---
id: TASK-070
title: Weather widget – integrate Open-Meteo API
status: Ready
assignee: []
created_date: '2026-05-10 21:48'
updated_date: '2026-05-11 16:57'
labels:
  - user story
dependencies: []
priority: medium
ordinal: 68000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The weather widget in the Dashboard is currently a stub showing placeholder data. The location (city + zip) is already stored in Settings. This task replaces the stub with real weather data from Open-Meteo (free, no API key required). The backend geocodes the configured city name to coordinates using the Open-Meteo Geocoding API, then fetches current conditions and a 5-day forecast from the Open-Meteo Forecast API. The frontend calls a new /api/weather endpoint and renders the result in the existing WeatherWidget component.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 New GET /api/weather endpoint added to the backend
- [ ] #2 Backend geocodes location_city from Settings via Open-Meteo Geocoding API (https://geocoding-api.open-meteo.com) to lat/lon
- [ ] #3 Backend fetches current temperature, weather code, precipitation, and 5-day forecast (max/min temp, precipitation sum, weather code) from Open-Meteo Forecast API
- [ ] #4 GET /api/weather returns 204 when no location is configured in Settings
- [ ] #5 GET /api/weather returns 422 when the city name cannot be geocoded (not found)
- [ ] #6 WeatherWidget in DashboardView replaces stub with real data from /api/weather
- [ ] #7 Weather codes are mapped to readable labels and emoji icons (e.g. code 0 → ☀️ Sonnig)
- [ ] #8 Widget shows a graceful empty state when no location is configured, with a link to Settings
- [ ] #9 docs/api/ contains a new weather.ts type file defining the WeatherData response shape
- [ ] #10 Backend weather route has tests covering: no location, city not found, and successful response
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
