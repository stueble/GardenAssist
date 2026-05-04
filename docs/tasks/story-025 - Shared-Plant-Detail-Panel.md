---
id: STORY-025
title: Shared Plant Detail Panel
status: Ready
assignee: []
created_date: '2026-05-04 22:45'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-005 - 005-UX-UI-Concept-Plants-Overview.md
  - ui-mockups/plants-overview/plants-overview-mockup.html
  - docs/api/plant.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the plant detail panel as a shared component reused in Plants Overview, Calendar, and Dashboard. Opens when a plant row, card, or pin is clicked.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Panel shows: plant icon (SVG + derived color), name, botanical name, close button
- [ ] #2 Image slots for main/bloom/leaf attachments with placeholder when empty
- [ ] #3 Fact sheet grid: origin type, location, bloom period, health status, frost tolerance, watering zone
- [ ] #4 Care notes section with yellow background
- [ ] #5 Open tasks list with due dates
- [ ] #6 'Bearbeiten' button opens Plant Edit Dialog
- [ ] #7 'Ask assistant' button opens AI chat with plant context pill
- [ ] #8 Panel closes via ✕
- [ ] #9 Component accepts a Plant object as prop — no direct API calls
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
