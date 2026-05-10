---
id: TASK-068
title: Show plant photo on garden plan pins
status: Ready
assignee: []
created_date: '2026-05-10 21:38'
labels:
  - user story
dependencies: []
ordinal: 63000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Currently plant pins on the garden plan show an emoji icon. If a plant has photo attachments, the first image should be shown inside the pin circle instead, making plants immediately recognisable on the plan. Emoji remains the fallback when no photo is available. Full-size images are used initially; a thumbnail API (see separate task) can replace the source URL later without further changes to this feature.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Pin shows the first photo attachment (cropped to circle, object-fit: cover) when the plant has at least one image attachment
- [ ] #2 Pin falls back to the existing emoji when the plant has no photo attachments
- [ ] #3 Pin size and layout (ring, task-status dot, tooltip, selected state) are unchanged
- [ ] #4 Behaviour is consistent across Dashboard and Calendar view (all places that render GardenPlanWidget with pins)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
