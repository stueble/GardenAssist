---
id: STORY-028
title: Plant Edit Dialog – Positionen
status: Ready
assignee: []
created_date: '2026-05-04 22:46'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-008 - 008-UX-UI-Concept-Plant-Edit-Dialog.md
  - docs/api/plant-position.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the Positionen section: user can place, move and remove plant pins on the garden plan. Garden plan shown in the center column in pick-mode.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Garden plan rendered in center column in pick-mode (click to place pin)
- [ ] #2 Placed pins shown as numbered markers on the plan
- [ ] #3 Position list in dialog shows X/Y coordinates per pin with delete button
- [ ] #4 Pins draggable to adjust position
- [ ] #5 Coordinates stored as x_percent / y_percent (0–100)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
