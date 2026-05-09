---
id: TASK-030
title: Dashboard – Garden Plan with Plant Pins
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 22:46'
updated_date: '2026-05-06 23:10'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-004 - 004-UX-UI-Concept-Dashboard.md
  - ui-mockups/dashboard/dashboard-mockup.html
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the central garden plan area with pannable/zoomable image and plant pins. Clicking a pin opens the Shared Plant Detail Panel in the left column.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Garden plan image rendered from Garden.plan_url; placeholder shown if not yet uploaded
- [x] #2 Plant pins rendered at x_percent/y_percent positions with SVG icon + colored ring
- [x] #3 Red dot indicator on pin if plant has overdue tasks
- [x] #4 Hover tooltip: plant name, health status, next task
- [x] #5 Click pin: opens Shared Plant Detail Panel in left column; replaces task list
- [x] #6 Zoom buttons ↕ ↔ work as described in mockup
- [x] #7 Legend shown bottom-left (overdue / current / ok)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
DashboardView implementiert: 280px linke Spalte (Weather-Stub + Todo-Liste oder PlantDetailPanel) + flexibler Mittelteil (GardenPlanWidget + Monatsband) + AiPanel. GardenPlanWidget um Dashboard-Pin-Props erweitert: emoji, name, hasTask (roter Dot, AC #3), selected, tooltip (AC #4), legend-Prop (AC #7). Pins aus plant.positions mit Emoji+Name+Tooltip. Pin-Klick öffnet PlantDetailPanel in linker Spalte (AC #5). Todo-Liste mit Priorisierung (Überfällig/Diese Woche/Demnächst). Monatsband mit 12 Zellen, aktueller Monat hervorgehoben. 15 neue Tests, 232 gesamt grün.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
