---
id: TASK-073
title: Weather Service – Soil Moisture & Water Balance Calculation
status: In Progress
assignee:
  - '@agent'
created_date: '2026-05-11 16:09'
updated_date: '2026-05-12 22:25'
labels:
  - backend
  - weather
  - enhancement
dependencies: []
priority: low
ordinal: 70000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement a weather service that calculates current soil moisture by combining Open-Meteo data with the garden's irrigation journal. Uses a daily FAO-56 water balance model to account for both natural precipitation and manual watering — more accurate than relying on Open-Meteo soil moisture alone, which has no knowledge of irrigation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Fetch soil_moisture_3_to_9cm from Open-Meteo as baseline value 14 days ago
- [ ] #2 Fetch daily precipitation_sum and et0_fao_evapotranspiration for the last 14 days (Archive + Forecast APIs combined)
- [ ] #3 Read irrigation journal entries for the last 14 days from the garden journal
- [ ] #4 Run daily water balance loop: moisture[t] = moisture[t-1] + precipitation[t] - et0[t] + irrigation[t], clamped to [0, field_capacity]
- [ ] #5 Expose current soil moisture (m³/m³) and a status enum (dry / ok / wet) via a typed service interface
- [ ] #6 Service covered by unit tests with mocked Open-Meteo responses and journal entries
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. ADR-010 erstellen: Field Capacity Ableitung aus Pflanzen-soil_type
2. docs/api/journal-entry.ts: Irrigation-Typ hinzufügen
3. docs/api/weather.ts: SoilMoistureData-Typen hinzufügen
4. Backend schemas: irrigation zu Zod-Enum
5. utils/geocoding.ts: shared helper aus weather.ts auslagern
6. routes/weather.ts: auf shared geocoding umstellen
7. services/soil-moisture.service.ts: FAO-56 Water Balance Service
8. routes/soil-moisture.ts: GET /api/soil-moisture
9. index.ts: Route mounten
10. Unit Tests für soil-moisture.service
11. Frontend JournalView: irrigation Typ + dedizierte Felder
12. Locale-Dateien: irrigation-Schlüssel
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
