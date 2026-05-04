---
id: STORY-031
title: Dashboard – Task List & Warnings
status: Ready
assignee: []
created_date: '2026-05-04 22:47'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-004 - 004-UX-UI-Concept-Dashboard.md
  - docs/api/task.ts
  - docs/api/journal-entry.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the left column task list: warnings, overdue/current/upcoming tasks with Done and Skip actions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Warning section shows frost risk and overdue task count
- [ ] #2 Tasks grouped by status: overdue (red), current (yellow), upcoming (blue)
- [ ] #3 Each task shows plant icon, plant name, schedule type, and due week
- [ ] #4 ✓ Done button: creates JournalEntry type 'done', task slides out left
- [ ] #5 → Skip button: creates JournalEntry type 'skipped', task slides out right
- [ ] #6 Task list hidden when Plant Detail Panel is open; restored when panel closes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
