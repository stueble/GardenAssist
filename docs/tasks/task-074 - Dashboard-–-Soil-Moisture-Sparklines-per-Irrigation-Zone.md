---
id: TASK-074
title: Dashboard – Soil Moisture Sparklines per Irrigation Zone
status: Ready
assignee: []
created_date: '2026-05-11 16:25'
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
- [ ] #1 Weather Widget shows one row per irrigation zone below the forecast strip
- [ ] #2 Each row contains: status dot, zone name, 14-day sparkline, current moisture percentage
- [ ] #3 Sparkline renders as an inline SVG polyline — no chart library
- [ ] #4 Status dot color reflects moisture status: green (ok), red (dry), blue (wet)
- [ ] #5 Section is hidden when no irrigation zones are configured in settings
- [ ] #6 Component covered by unit tests
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
