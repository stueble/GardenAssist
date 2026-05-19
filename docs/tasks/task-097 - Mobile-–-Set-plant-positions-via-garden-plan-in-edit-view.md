---
id: TASK-097
title: Mobile – Set plant positions via garden plan in edit view
status: Ready
assignee: []
created_date: '2026-05-17 00:50'
updated_date: '2026-05-19 19:58'
labels:
  - feature
dependencies: []
ordinal: 95000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On desktop, the garden plan is shown in the center column next to the Plant Edit Dialog, allowing pick-mode pin placement. On mobile, the PlantEditDialog currently hides the pick-mode button entirely (hidePickMode=true, pickMode=false). This task introduces a mobile-appropriate flow for placing and repositioning pins: a dedicated fullscreen plan picker screen is opened from within the Positionen section of MobilePlantEditView. The user taps the plan to place pins, then confirms and returns to the edit form. The existing GardenPlanWidget with pickMode=true is reused — no new placement logic needed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The Positionen section in MobilePlantEditView shows a '📍 Auf Plan setzen' button when a garden plan exists
- [ ] #2 Tapping the button opens a fullscreen plan picker screen (new route or overlay) showing GardenPlanWidget in pick mode
- [ ] #3 Tapping on the plan places a numbered pin; already-placed pins are shown and can be repositioned by drag
- [ ] #4 A delete button per pin allows removing individual positions
- [ ] #5 A confirm button ('Übernehmen') returns to the edit form with the updated positions
- [ ] #6 Positions are passed back into MobilePlantEditView and included in the save payload — same data flow as desktop (x_percent / y_percent)
- [ ] #7 If no garden plan is uploaded, the button is hidden and existing behaviour (manual X/Y inputs) remains
- [ ] #8 No regression on desktop — pick mode, GardenPlanWidget and PlantEditDialog behaviour unchanged
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
