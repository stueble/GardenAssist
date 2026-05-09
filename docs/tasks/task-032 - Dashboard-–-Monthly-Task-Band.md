---
id: TASK-032
title: Dashboard – Monthly Task Band
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 22:47'
updated_date: '2026-05-07 17:30'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-004 - 004-UX-UI-Concept-Dashboard.md
  - ui-mockups/dashboard/dashboard-mockup.html
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the 12-month band at the bottom of the dashboard center area showing task density per month.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 12 month cells rendered below the garden plan, aligned to center column
- [x] #2 Current month highlighted with darker background
- [x] #3 Each cell shows colored dots for task types present in that month
- [x] #4 Hover tooltip shows task list grouped by type for that month
- [x] #5 Band derived from Garden.plants[].tasks[] — no additional API call
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
MonthBand komplett überarbeitet: Datenquelle auf plant.schedules gefiltert nach CARE_TYPES; Multi-Monat-Spans (Schedule wird in allen überspannten Monaten gezeigt); 1 Dot pro Schedule-Typ pro Monat (dedupliziert); Dots behalten echte Farbe auch auf aktuellem Monat; box-shadow auf aktuellem Monat; Hover-Tooltip mit Monatstitel, Gruppen nach Typ (Icon + Pflanzennamen), Keine-Aufgaben-Fallback, Pfeil; overflow:visible für Tooltip-Sichtbarkeit; 5 neue Tests, 239 gesamt grün.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
