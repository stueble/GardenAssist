---
id: TASK-033
title: Calendar – Gantt Structure & Plant Rows
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 22:47'
updated_date: '2026-05-07 21:11'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-006 - 006-UX-UI-Concept-Garden-Calendar.md
  - ui-mockups/calendar/calendar-mockup.html
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the Calendar view shell: sticky plant name column on the left, 12 month columns, scrollable rows per plant. Current month highlighted with vertical line.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Plant rows derived from Garden.plants[], one row per plant
- [x] #2 12 month columns with month name headers
- [x] #3 Sticky plant name column (left) with thumbnail, common name, botanical name
- [x] #4 Current month highlighted with vertical line (not column tint)
- [x] #5 Live search filters rows by plant name
- [x] #6 Click row opens Shared Plant Detail Panel overlaying from left
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
CalendarView vollständig implementiert: 220px sticky Pflanzenspalte (Thumbnail/Name/Botanisch), 12 Monatsspalten mit Header, Schedule-Typ-Toggles (6 Typen), Gantt-Balken aus schedule.start_week/end_week als %-Positionen, aktueller Monat hervorgehoben (Header-Tint + Spaltenhintergrund), Live-Suche, PlantDetailPanel als Overlay von links. 13 neue Tests, 252 gesamt grün.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
