---
id: TASK-025
title: Shared Plant Detail Panel
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 22:45'
updated_date: '2026-05-05 22:49'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-005 - 005-UX-UI-Concept-Plants-Overview.md
  - ui-mockups/plants-overview/plants-overview-mockup.html
  - docs/api/plant.ts
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the plant detail panel as a shared component reused in Plants Overview, Calendar, and Dashboard. Opens when a plant row, card, or pin is clicked.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Panel shows: plant icon (SVG + derived color), name, botanical name, close button
- [x] #2 Image slots for main/bloom/leaf attachments with placeholder when empty
- [x] #3 Fact sheet grid: origin type, location, bloom period, health status, frost tolerance, watering zone
- [x] #4 Care notes section with yellow background
- [x] #5 Open tasks list with due dates
- [x] #6 'Bearbeiten' button opens Plant Edit Dialog
- [x] #7 'Ask assistant' button opens AI chat with plant context pill
- [x] #8 Panel closes via ✕
- [x] #9 Component accepts a Plant object as prop — no direct API calls
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
PlantDetailPanel als eigenständige Komponente extrahiert (apps/frontend/src/components/PlantDetailPanel.tsx). Akzeptiert Plant als Prop ohne eigene API-Calls (AC#9). PlantsView nutzt die Komponente via Import. onAssist-Callback öffnet den AI-Panel (AC#7). onEdit-Callback als Stub für Story-026 (AC#6). 14 neue Tests alle grün (142 gesamt).
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
