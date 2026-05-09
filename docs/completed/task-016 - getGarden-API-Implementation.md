---
id: TASK-016
title: getGarden API Implementation
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 17:26'
updated_date: '2026-05-04 23:14'
labels:
  - setup
dependencies: []
documentation:
  - docs/api/garden.ts
  - docs/api/task.ts
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the getGarden() endpoint with real database queries. This is the root call that powers all views — completing it unblocks all UI implementation tasks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 getGarden() queries all plants with positions, schedules, attachments, and journal entries
- [x] #2 Tasks are derived from schedules minus resolved journal entries
- [x] #3 Garden attachments and journal entries included
- [x] #4 Response matches Garden type from docs/api/garden.ts exactly
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. src/services/tasks.ts (pure Task-Derivations-Logik: ISO-Wochen, overdue/due/upcoming)
2. src/services/garden.service.ts (getGarden mit echten DB-Queries)
3. src/routes/garden.ts (GET /api/garden auf Service umstellen)
4. Tests: Task-Derivation unit tests + getGarden Integration mit in-memory DB
5. Typecheck + Tests gruen
6. ACs, Final Summary, In Review, Commit
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented getGarden() with real DB queries and task derivation.

Changes:
- src/services/tasks.ts: pure task derivation logic
  - ISO 8601 week helpers (isoWeekNumber, toIsoWeek, isoWeekToDate, weeksInYear)
  - expandScheduleWeeks(): expands a schedule into ISO week strings within a window, handles year-end wrapping (end_week < start_week)
  - deriveTasks(): generates Task[] from schedules minus resolved journal entries (done/skipped); status = overdue/due/upcoming; sorted overdue-first
- src/services/garden.service.ts: assembles the full Garden object from normalized DB tables
  - Bulk queries (no N+1): plants, positions, schedules, journal_entries, attachments, journal_entry_attachments all loaded in single queries
  - Maps flat DB rows to nested API types
  - Garden-wide journal entries and attachments included
  - All journal entries sorted by date descending
- src/routes/garden.ts: GET /api/garden now calls getGarden(db) instead of mockGarden()
- 16 task derivation unit tests (ISO weeks, wrapping, suppression, status, sorting)
- 8 garden service integration tests (empty garden, plan metadata, plants+positions, task derivation, done suppression, journal entries, attachments, shape)

Verified:
- 42/42 backend tests passing
- typecheck clean
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Implementation finished
- [x] #2 Test(s) added
- [x] #3 No regressions introduced
- [x] #4 Documentation updated
- [x] #5 Changes committed
<!-- DOD:END -->
