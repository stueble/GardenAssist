---
id: TASK-094
title: Mobile – Plan View Snap-Sheet (Google-Maps-style pin preview)
status: Done
assignee:
  - '@agent'
created_date: '2026-05-17 00:09'
updated_date: '2026-05-19 19:43'
labels: []
dependencies: []
ordinal: 91000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the current small PinChip tooltip on the plan view with a two-state snap-sheet that follows the Google Maps pattern. First tap on a pin opens a peek sheet (~25% screen height) with key plant info. Swiping up expands the sheet to ~85% height showing full details — reusing PlantDetailContent. The map remains visible behind both states. Navigation to MobilePlantDetailView from the plan is no longer needed; the expanded sheet IS the detail view in this context.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 First tap on a pin opens a peek sheet from the bottom (~25% screen height) showing: plant emoji, name, botanical name, status badge, location, watering zone, and next task with due info
- [x] #2 Swiping the sheet upward snaps it to expanded state (~85% screen height); the map shrinks to a strip at the top with the active pin still visible
- [x] #3 The expanded sheet renders PlantDetailContent directly — no duplication of content, same component used by MobilePlantDetailView
- [x] #4 Tapping the map backdrop (outside the sheet) dismisses the sheet entirely
- [x] #5 Tapping a different pin while a sheet is open dismisses the current sheet and opens a new peek sheet for the new pin
- [x] #6 The edit button (pencil icon) in the expanded sheet header navigates to /plants/:id/edit
- [x] #7 Swipe-down gesture on the expanded sheet snaps it back to peek state; another swipe-down dismisses it
- [x] #8 The existing PinChip component is removed; MobilePlanView no longer navigates to /plants/:id on pin tap
- [x] #9 No regression on desktop — desktop hover tooltip and click-to-detail behaviour unchanged
- [x] #10 All new interactions covered by tests
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced PinChip with a Google-Maps-style snap-sheet. Sheet renders in two states: peek (~28vh, overflow:hidden) and expanded (~85vh, overflow:auto). Header shows emoji + name + botanical name + edit + close buttons. Body reuses PlantDetailContent directly — no content duplication. Swipe gestures via PointerEvent on drag handle (50px threshold). Backdrop and plan-area tap dismiss the sheet. Edit navigates to /plants/:id/edit. Delete calls invalidateGarden + dismisses. 30 tests covering all ACs. Typecheck clean.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
