---
id: TASK-031
title: Dashboard – Task List & Warnings
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 22:47'
updated_date: '2026-05-07 15:58'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-004 - 004-UX-UI-Concept-Dashboard.md
  - docs/api/task.ts
  - docs/api/journal-entry.ts
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the left column task list: warnings, overdue/current/upcoming tasks with Done and Skip actions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Warning section shows frost risk and overdue task count
- [x] #2 Tasks grouped by status: overdue (red), current (yellow), upcoming (blue)
- [x] #3 Each task shows plant icon, plant name, schedule type, and due week
- [x] #4 ✓ Done button: creates JournalEntry type 'done', task slides out left
- [x] #5 → Skip button: creates JournalEntry type 'skipped', task slides out right
- [x] #6 Task list hidden when Plant Detail Panel is open; restored when panel closes
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Warning-Typ in Garden-API ergänzt. Backend gibt hardcoded Wettermodul-Warnung zurück. Frontend: WarningsSection-Komponente über TodoList, nur sichtbar wenn warnings.length > 0. Styling exakt nach Mockup (orange Dot, Trennlinie). 2 neue Tests, 234 Frontend-Tests grün.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
