---
id: TASK-096
title: Garden Plan – Edit mode for repositioning existing pins
status: Ready
assignee: []
created_date: '2026-05-17 00:34'
labels: []
dependencies: []
ordinal: 94000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users currently can only place or move pins via the Plant Edit Dialog, which requires opening the full edit form. This feature adds a dedicated edit mode directly on the garden plan (desktop and mobile) that allows repositioning existing pins via drag-and-drop without opening the edit dialog. The mode is toggled explicitly (e.g. via an edit button on the plan) so that normal pan/zoom behaviour is not disrupted. On mobile, the snap-sheet (see pin snap-sheet task) should not open while edit mode is active — drag is the primary interaction instead.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An edit-mode toggle button is available on the garden plan (desktop: in the control area; mobile: in the top bar)
- [ ] #2 While edit mode is active, dragging a pin repositions it; pan is disabled so drag is unambiguous
- [ ] #3 Dropping a pin saves the new x_percent / y_percent via the existing PUT /plants/:id endpoint — no full form submit required
- [ ] #4 A visual indicator (e.g. dashed border, different cursor) makes edit mode clearly distinguishable from normal view mode
- [ ] #5 Tapping/clicking outside any pin in edit mode does nothing (no pick-mode placement of new pins)
- [ ] #6 Edit mode is exited via the same toggle button or an explicit close/done button
- [ ] #7 On mobile, the snap-sheet is suppressed while edit mode is active
- [ ] #8 No regression — normal pan, zoom, and pin-tap behaviour unchanged when edit mode is inactive
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
