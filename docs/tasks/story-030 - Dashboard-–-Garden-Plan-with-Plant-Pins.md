---
id: STORY-030
title: Dashboard – Garden Plan with Plant Pins
status: Ready
assignee: []
created_date: '2026-05-04 22:46'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-004 - 004-UX-UI-Concept-Dashboard.md
  - ui-mockups/dashboard/dashboard-mockup.html
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the central garden plan area with pannable/zoomable image and plant pins. Clicking a pin opens the Shared Plant Detail Panel in the left column.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Garden plan image rendered from Garden.plan_url; placeholder shown if not yet uploaded
- [ ] #2 Plant pins rendered at x_percent/y_percent positions with SVG icon + colored ring
- [ ] #3 Red dot indicator on pin if plant has overdue tasks
- [ ] #4 Hover tooltip: plant name, health status, next task
- [ ] #5 Click pin: opens Shared Plant Detail Panel in left column; replaces task list
- [ ] #6 Zoom buttons ↕ ↔ work as described in mockup
- [ ] #7 Legend shown bottom-left (overdue / current / ok)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
