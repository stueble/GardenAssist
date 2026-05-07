---
id: STORY-034
title: Calendar – Schedule Bars & Filter Toggles
status: Done
assignee: []
created_date: '2026-05-04 22:47'
updated_date: '2026-05-07 21:16'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-006 - 006-UX-UI-Concept-Garden-Calendar.md
  - docs/api/schedule.ts
ordinal: 39000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Render colored schedule bars in the Gantt grid and implement the schedule type filter toggles in the subheader.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Schedule bars rendered for each plant row based on Plant.schedules[]
- [ ] #2 Bar color taken from Schedule.color; width derived from start_week/end_week
- [ ] #3 Year-wrapping intervals (start_week > end_week) rendered correctly across December/January
- [ ] #4 Filter toggles: Blütezeit, Wachstum, Blätter, Schnitt, Düngung, Sonstiges
- [ ] #5 Active toggle shows only bars of that schedule type; multiple toggles can be active simultaneously
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
