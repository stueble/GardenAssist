---
id: STORY-024
title: Plants Overview – Table & Search
status: Ready
assignee: []
created_date: '2026-05-04 22:45'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-005 - 005-UX-UI-Concept-Plants-Overview.md
  - ui-mockups/plants-overview/plants-overview-mockup.html
  - docs/api/plant.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the Plants Overview main table view with live search, sorting, and status badges. Connected to getGarden() for plant data.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Table renders all plants from Garden.plants[] with columns: thumbnail, name/botanical, status badge, location, next task
- [ ] #2 Live search filters by common name, botanical name, and location
- [ ] #3 Column headers clickable for ascending/descending sort
- [ ] #4 Status badge per plant: overdue (red), due (yellow), upcoming (blue), ok (green) — derived from Plant.tasks[]
- [ ] #5 Card view toggle (☰/⊞) switches between table and card layout
- [ ] #6 FAB (＋) button visible; opens Plant Edit Dialog (wired up in Plant Edit task)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
