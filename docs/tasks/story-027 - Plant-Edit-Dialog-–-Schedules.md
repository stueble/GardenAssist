---
id: STORY-027
title: Plant Edit Dialog – Schedules
status: Ready
assignee: []
created_date: '2026-05-04 22:45'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-008 - 008-UX-UI-Concept-Plant-Edit-Dialog.md
  - docs/api/schedule.ts
  - docs/api/color-preset.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement all schedule sections in the Plant Edit Dialog: Blütezeiten, Wachstum, Blätter, Schnittzeiten, Düngezeiten, Sonstiges. Each section allows adding, editing and removing schedule entries.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each schedule type rendered as a collapsible section with colored accent
- [ ] #2 Add entry button creates a new schedule row with start_week, end_week, color picker, and label
- [ ] #3 Color picker shows ColorPresets for the schedule type from Settings
- [ ] #4 Week range input validates start_week and end_week (1–52); year-wrap (start > end) visually indicated
- [ ] #5 Delete button removes a schedule entry
- [ ] #6 Entry count badge shown in collapsed section header
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
