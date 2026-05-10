---
id: TASK-067
title: AI assistant – allow plant editing from any view
status: In Progress
assignee:
  - '@agent'
created_date: '2026-05-10 21:35'
updated_date: '2026-05-10 22:01'
labels:
  - user story
dependencies: []
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Currently the AI assistant's editPlant tool only works when the user is in the Plants view. In all other views (Dashboard, Calendar, Journal) the assistant responds with an error asking the user to switch views. This is unnecessarily restrictive — the assistant is always visible and should be able to edit plants regardless of the active view. The fix is to lift registerPlantEditHandler out of PlantsView so the plant edit dialog can be triggered from anywhere.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The editPlant tool call succeeds from Dashboard, Calendar, Journal, and Settings views
- [x] #2 Editing from a non-Plants view opens the plant edit dialog (same review-before-save flow as in Plants view)
- [x] #3 If a specific plant is selected in the current view, it is pre-set as context in the dialog
- [x] #4 The error message 'Plant management is not currently open. Please switch to the Plants view.' is no longer shown
- [x] #5 Existing Plants view behaviour is unchanged
- [x] #6 Tests cover the editPlant dispatch from at least two non-Plants views
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Move PlantEditDialog + registerPlantEditHandler registration from PlantsView up to App.tsx so the dialog is always mounted
2. The dialog renders as a global overlay (same layout as today: edit panel + garden plan + AI assistant)
3. Remove the "not currently open" guard in dispatchToolCall — handler is always available
4. Verify that the Plants view no longer owns the dialog state (no duplication)
5. Test editPlant dispatch from Dashboard, Calendar, and Journal views
6. Check off ACs, add final summary, move to In Review
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- GlobalPlantEditOverlay erstellt: immer gemountet in App.tsx, position:fixed Overlay
- Handler via usePlantEditHandler einmalig global registriert
- PlantsView, DashboardView, CalendarView von usePlantEditDialog/PlantEditDialog befreit
- CalendarView invalidateGarden-Bug (fehlender Aufruf in onSaved) ebenfalls behoben
- pendingPlantEdit aus Dashboard/Calendar entfernt (kein Dialog mehr dort)
- 4 neue Tests in App.test.tsx: Handler aktiv bei Journal- und Settings-View
- 401/401 Tests grün, Typecheck sauber
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Liftet PlantEditDialog + GardenPlanWidget in einen GlobalPlantEditOverlay (position:fixed, zIndex:200) der in App.tsx immer gemountet ist. Der editPlant-Handler ist dadurch in allen Views (Dashboard, Calendar, Journal, Settings, Plants) verfügbar. PlantsView, DashboardView und CalendarView wurden von dupliziertem usePlantEditDialog-Code befreit. Nebenher: CalendarView-Bug gefixt (invalidateGarden wurde in onSaved nicht aufgerufen). 4 neue Tests bestätigen Handler-Registrierung bei Journal und Settings. 401/401 Tests grün.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
