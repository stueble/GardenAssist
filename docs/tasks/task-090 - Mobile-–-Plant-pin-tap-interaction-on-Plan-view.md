---
id: TASK-090
title: Mobile – Plant pin tap interaction on Plan view
status: Ready
assignee: []
created_date: '2026-05-16 14:41'
labels: []
dependencies: []
ordinal: 87000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On mobile, there is no hover — touch only knows tap. The current plan view shows a tooltip chip on pin tap but does not navigate anywhere. This task implements a two-tap pattern consistent with Google Maps: first tap shows a confirmation chip above the pin (emoji + name + status), second tap on the chip navigates to MobilePlantDetailView. Tapping anywhere else dismisses the chip.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 First tap on a plant pin shows a chip above the pin with: plant emoji, plant name, and a status color indicator (red for overdue, amber for current tasks, none otherwise)
- [ ] #2 Tapping the chip navigates to MobilePlantDetailView for that plant
- [ ] #3 Tapping anywhere on the plan outside the chip dismisses it without navigation
- [ ] #4 Tapping a different pin while a chip is visible dismisses the previous chip and shows the new one
- [ ] #5 Chip appearance and dismissal is consistent with the existing tooltip implementation in GardenPlanWidget
- [ ] #6 No regression on desktop — desktop hover tooltip and click-to-detail behavior unchanged
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
