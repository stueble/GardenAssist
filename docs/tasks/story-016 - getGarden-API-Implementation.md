---
id: STORY-016
title: getGarden API Implementation
status: Ready
assignee: []
created_date: '2026-05-04 17:26'
updated_date: '2026-05-04 17:28'
labels:
  - setup
dependencies: []
documentation:
  - docs/api/garden.ts
  - docs/api/task.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the getGarden() endpoint with real database queries. This is the root call that powers all views — completing it unblocks all UI implementation tasks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 getGarden() queries all plants with positions, schedules, attachments, and journal entries
- [ ] #2 Tasks are derived from schedules minus resolved journal entries
- [ ] #3 Garden attachments and journal entries included
- [ ] #4 Response matches Garden type from docs/api/garden.ts exactly
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
