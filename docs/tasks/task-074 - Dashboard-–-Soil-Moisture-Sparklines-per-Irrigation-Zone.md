---
id: TASK-074
title: Dashboard – Soil Moisture Sparklines per Irrigation Zone
status: In Review
assignee:
  - '@agent'
created_date: '2026-05-11 16:25'
updated_date: '2026-05-12 23:02'
labels:
  - frontend
  - weather
  - enhancement
dependencies:
  - TASK-073
priority: low
ordinal: 72000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a soil moisture section to the Weather Widget in the dashboard left column. Shows one row per irrigation zone with a 14-day sparkline and the current moisture value. Uses the water balance service from task-073. Rows are color-coded by status: green (ok), red (dry), blue (wet).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Weather Widget shows one row per irrigation zone below the forecast strip
- [x] #2 Each row contains: status dot, zone name, 14-day sparkline, current moisture percentage
- [x] #3 Sparkline renders as an inline SVG polyline — no chart library
- [x] #4 Status dot color reflects moisture status: green (ok), red (dry), blue (wet)
- [x] #5 Section is hidden when no irrigation zones are configured in settings
- [x] #6 Component covered by unit tests
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. getSoilMoisture() API-Client-Funktion hinzufügen
2. Singleton-State-Pattern für soil-moisture im WeatherWidget
3. SoilMoistureSection-Komponente: eine Zeile pro Zone mit Status-Dot, Name, SVG-Sparkline, Prozentwert
4. WeatherWidget: zones-Prop + settings-Zugriff, Section bedingt rendern
5. i18n-Schlüssel für de/en
6. Unit-Tests
7. Commit
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
SoilMoistureSection added below the 5-day forecast strip in WeatherWidget. Uses module-level singleton polling pattern (60 min interval) identical to weather. One row per zone: 8px status dot (red/green/blue), zone name, 56×20px SVG polyline sparkline (no library), current % value. Section hidden when irrigation_zones is empty. 7 unit tests added via setSoilStateForTesting() injection to avoid async polling in tests. All 499 frontend + 170 backend tests pass, no type errors.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
