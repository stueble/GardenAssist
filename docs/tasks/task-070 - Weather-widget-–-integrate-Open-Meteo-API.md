---
id: TASK-070
title: Weather widget – integrate Open-Meteo API
status: Done
assignee:
  - '@agent'
created_date: '2026-05-10 21:48'
updated_date: '2026-05-11 20:04'
labels:
  - user story
dependencies: []
priority: medium
ordinal: 69000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The weather widget in the Dashboard is currently a stub showing placeholder data. The location (city + zip) is already stored in Settings. This task replaces the stub with real weather data from Open-Meteo (free, no API key required). The backend geocodes the configured city name to coordinates using the Open-Meteo Geocoding API, then fetches current conditions and a 5-day forecast from the Open-Meteo Forecast API. The frontend calls a new /api/weather endpoint and renders the result in the existing WeatherWidget component.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 New GET /api/weather endpoint added to the backend
- [x] #2 Backend geocodes location_city from Settings via Open-Meteo Geocoding API (https://geocoding-api.open-meteo.com) to lat/lon
- [x] #3 Backend fetches current temperature, weather code, precipitation, and 5-day forecast (max/min temp, precipitation sum, weather code) from Open-Meteo Forecast API
- [x] #4 GET /api/weather returns 204 when no location is configured in Settings
- [x] #5 GET /api/weather returns 422 when the city name cannot be geocoded (not found)
- [x] #6 WeatherWidget in DashboardView replaces stub with real data from /api/weather
- [x] #7 Weather codes are mapped to readable labels and emoji icons (e.g. code 0 → ☀️ Sonnig)
- [x] #8 Widget shows a graceful empty state when no location is configured, with a link to Settings
- [x] #9 docs/api/ contains a new weather.ts type file defining the WeatherData response shape
- [x] #10 Backend weather route has tests covering: no location, city not found, and successful response
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added GET /api/weather backend route that geocodes location_city via Open-Meteo Geocoding API (lat/lon), then fetches current conditions and 5-day forecast from Open-Meteo Forecast API. Returns 204 when no city configured, 422 when city not found, 502 on upstream errors. WeatherWidget in DashboardView replaced stub with real data fetch using useEffect/useState, showing current temp, weather code label+icon, and 5-day forecast with per-day icons, max/min temps and weekday labels. WMO weather codes mapped to emoji icons and labels in both de/en i18n. docs/api/weather.ts defines WeatherData and WeatherDay types. 13 backend tests covering all AC edge cases. 469/469 frontend tests pass, all typechecks clean.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
