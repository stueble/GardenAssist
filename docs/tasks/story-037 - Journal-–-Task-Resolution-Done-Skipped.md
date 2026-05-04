---
id: STORY-037
title: Journal – Task Resolution (Done & Skipped)
status: Ready
assignee: []
created_date: '2026-05-04 22:48'
labels: []
dependencies: []
documentation:
  - docs/api/journal-entry.ts
  - docs/api/task.ts
  - >-
    docs/decisions/decision-005 - ADR-005 - Ephemeral Tasks and Journal as
    Persistent Protocol.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement automatic journal entry creation when tasks are marked as done or skipped from the Dashboard. Ensures tasks no longer appear after resolution.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Marking a task as Done on the Dashboard creates a JournalEntry with type 'done', schedule_id, and week
- [ ] #2 Marking a task as Skipped creates a JournalEntry with type 'skipped'
- [ ] #3 Resolved tasks no longer appear in Garden.plants[].tasks[] after getGarden() refresh
- [ ] #4 Auto-created entries appear in the Journal timeline
- [ ] #5 Entry title auto-filled from schedule type and plant name
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
