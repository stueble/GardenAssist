---
id: TASK-090
title: Mobile – Plant pin tap interaction on Plan view
status: Done
assignee:
  - '@agent'
created_date: '2026-05-16 14:41'
updated_date: '2026-05-16 18:48'
labels: []
dependencies: []
ordinal: 90000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On mobile, there is no hover — touch only knows tap. The current plan view shows a tooltip chip on pin tap but does not navigate anywhere. This task implements a two-tap pattern consistent with Google Maps: first tap shows a confirmation chip above the pin (emoji + name + status), second tap on the chip navigates to MobilePlantDetailView. Tapping anywhere else dismisses the chip.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 First tap on a plant pin shows a chip above the pin with: plant emoji, plant name, and a status color indicator (red for overdue, amber for current tasks, none otherwise)
- [x] #2 Tapping the chip navigates to MobilePlantDetailView for that plant
- [x] #3 Tapping anywhere on the plan outside the chip dismisses it without navigation
- [x] #4 Tapping a different pin while a chip is visible dismisses the previous chip and shows the new one
- [x] #5 Chip appearance and dismissal is consistent with the existing tooltip implementation in GardenPlanWidget
- [x] #6 No regression on desktop — desktop hover tooltip and click-to-detail behavior unchanged
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented two-tap mobile pin interaction: first tap shows a confirmation chip (pill shape, position:fixed) above the pin with emoji, name, status dot and nextTask; second tap on chip or same pin navigates to /plants/:id; background tap dismisses. Extracted plantToPin() into src/lib/plantToPin.ts so desktop and mobile share identical pin rendering (photo override, halftransparent background, i18n status labels, nextTask). DashboardView updated to import from lib. 10 new tests added covering all ACs. Typecheck clean, all pre-existing tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
