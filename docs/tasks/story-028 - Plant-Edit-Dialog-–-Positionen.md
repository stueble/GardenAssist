---
id: STORY-028
title: Plant Edit Dialog – Positionen
status: In Progress
assignee:
  - '@agent'
created_date: '2026-05-04 22:46'
updated_date: '2026-05-06 19:23'
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
- [x] #1 Garden plan rendered in center column in pick-mode (click to place pin)
- [x] #2 Placed pins shown as numbered markers on the plan
- [x] #3 Position list in dialog shows X/Y coordinates per pin with delete button
- [x] #4 Pins draggable to adjust position
- [x] #5 Coordinates stored as x_percent / y_percent (0–100)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
GardenPlanWidget als wiederverwendbare Komponente implementiert: Pan (Maus/Touch), Zoom (Mausrad, Pinch-to-zoom), Fit-Height/Fit-Width-Buttons, Pins mit pulsierendem Ring und Counter-Scale, Pick-Mode für Klick-Platzierung. PlantsView: zeigt GardenPlanWidget im Zentrum wenn Edit-Dialog offen ist; positions-State als Shared State; planUrl aus getGarden(). PlantEditDialog: neue Props (positions, pickMode etc.), Positions-Sektion mit Pick-Mode-Toggle, X/Y-Inputs, Add/Delete-Rows, Count-Badge, formToInput übergibt positions. 23 neue Tests, 209 gesamt grün.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
