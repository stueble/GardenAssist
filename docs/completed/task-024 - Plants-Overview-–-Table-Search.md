---
id: TASK-024
title: Plants Overview – Table & Search
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 22:45'
updated_date: '2026-05-09 17:37'
labels:
  - user story
dependencies: []
documentation:
  - docs/docs/doc-005 - 005-UX-UI-Concept-Plants-Overview.md
  - ui-mockups/plants-overview/plants-overview-mockup.html
  - docs/api/plant.ts
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the Plants Overview main table view with live search, sorting, and status badges. Connected to getGarden() for plant data.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Table renders all plants from Garden.plants[] with columns: thumbnail, name/botanical, status badge, location, next task
- [x] #2 Live search filters by common name, botanical name, and location
- [x] #3 Column headers clickable for ascending/descending sort
- [x] #4 Status badge per plant: overdue (red), due (yellow), upcoming (blue), ok (green) — derived from Plant.tasks[]
- [x] #5 Card view toggle (☰/⊞) switches between table and card layout
- [x] #6 FAB (＋) button visible; opens Plant Edit Dialog (wired up in Plant Edit task)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. i18n-Keys für Plants-View (de/en)
2. PlantStatusBadge-Komponente (overdue/due/upcoming/ok)
3. PlantsView komplett neu — Subheader, Tabelle, Kartenansicht, Detail-Panel, FAB
4. getGarden()-Daten laden und verdrahten
5. Tests
6. Commit
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
PlantsView komplett implementiert. Subheader mit Live-Suche (Name, Botanisch, Standort), Ergebniszähler, Tabellen-/Kartenansicht-Toggle. Tabelle mit 9 Spalten, sticky Header, sortierbar (Name, Typ, Standort, Status). Status-Badges (overdue/due/upcoming/ok) aus Plant.tasks[] abgeleitet. Detail-Panel links (300px, slide-in) mit Steckbrief, Pflege-Historie, Pflegehinweise, Aktionsbuttons. FAB ＋. Hilfsfunktionen in lib/plantStatus.ts. 22 Tests, 128 gesamt grün.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
