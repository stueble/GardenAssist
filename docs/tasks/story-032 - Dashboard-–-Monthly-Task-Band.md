---
id: STORY-032
title: Dashboard – Monthly Task Band
status: Ready
assignee: []
created_date: '2026-05-04 22:47'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-004 - 004-UX-UI-Concept-Dashboard.md
  - ui-mockups/dashboard/dashboard-mockup.html
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the 12-month band at the bottom of the dashboard center area showing task density per month.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 12 month cells rendered below the garden plan, aligned to center column
- [ ] #2 Current month highlighted with darker background
- [ ] #3 Each cell shows colored dots for task types present in that month
- [ ] #4 Hover tooltip shows task list grouped by type for that month
- [ ] #5 Band derived from Garden.plants[].tasks[] — no additional API call
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
