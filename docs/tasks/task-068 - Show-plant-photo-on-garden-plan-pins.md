---
id: TASK-068
title: Show plant photo on garden plan pins
status: Done
assignee:
  - '@agent'
created_date: '2026-05-10 21:38'
updated_date: '2026-05-10 22:39'
labels:
  - user story
dependencies: []
ordinal: 62000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Currently plant pins on the garden plan show an emoji icon. If a plant has photo attachments, the first image should be shown inside the pin circle instead, making plants immediately recognisable on the plan. Emoji remains the fallback when no photo is available. Full-size images are used initially; a thumbnail API (see separate task) can replace the source URL later without further changes to this feature.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Pin shows the first photo attachment (cropped to circle, object-fit: cover) when the plant has at least one image attachment
- [x] #2 Pin falls back to the existing emoji when the plant has no photo attachments
- [x] #3 Pin size and layout (ring, task-status dot, tooltip, selected state) are unchanged
- [x] #4 Behaviour is consistent across Dashboard and Calendar view (all places that render GardenPlanWidget with pins)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
PlanPin bekommt optionales photoUrl-Feld. GardenPlanWidget rendert im Dashboard-Modus ein kreisförmig zugeschnittenes <img> (object-fit: cover, border-radius: 50%) wenn photoUrl gesetzt ist, sonst weiterhin das Emoji. DashboardView.plantToPin() liest plant.attachments.find(a => a.attachment_type === "image")?.url. Alle bestehenden Pin-Eigenschaften (Ring, Status-Dot, Tooltip, Selected-State) bleiben unverändert. 3 neue Tests in GardenPlanWidget.test.tsx. 404/404 Tests grün.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
