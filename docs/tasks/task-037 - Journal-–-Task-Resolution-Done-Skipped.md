---
id: TASK-037
title: Journal – Task Resolution (Done & Skipped)
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 22:48'
updated_date: '2026-05-07 15:38'
labels: []
dependencies: []
documentation:
  - docs/api/journal-entry.ts
  - docs/api/task.ts
  - >-
    docs/decisions/decision-005 - ADR-005 - Ephemeral Tasks and Journal as
    Persistent Protocol.md
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement automatic journal entry creation when tasks are marked as done or skipped from the Dashboard. Ensures tasks no longer appear after resolution.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Marking a task as Done on the Dashboard creates a JournalEntry with type 'done', schedule_id, and week
- [x] #2 Marking a task as Skipped creates a JournalEntry with type 'skipped'
- [x] #3 Resolved tasks no longer appear in Garden.plants[].tasks[] after getGarden() refresh
- [x] #4 Auto-created entries appear in the Journal timeline
- [x] #5 Entry title auto-filled from schedule type and plant name
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Echten createJournalEntry-Handler im Backend implementieren (DB-Insert, auto-title aus schedule_type + plant_name)
2. updateJournalEntry implementieren
3. Tests
4. Typecheck + Tests grün
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Journal-Route von Stub auf echte DB-Implementierung umgestellt. POST /api/journal: Insert in DB, Auto-Title aus entry_type + schedule_type + plant_name (AC #5). PUT /api/journal/:id: Update mit 404 wenn nicht gefunden. Schema: plant_id/schedule_id als string.nullable() damit Seed-IDs akzeptiert werden. 5 neue Tests, 68 Backend-Tests grün. Live-Test bestätigt: done-Entry für Magnolia 'Lüften W13' erstellt, Task aus getGarden() verschwunden.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
