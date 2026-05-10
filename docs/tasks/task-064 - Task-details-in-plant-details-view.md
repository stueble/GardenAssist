---
id: TASK-064
title: Task details in plant details view
status: Done
assignee:
  - '@agent'
created_date: '2026-05-10 00:13'
updated_date: '2026-05-10 01:19'
labels:
  - user story
dependencies: []
ordinal: 59000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a user, I want to be able to be able to unfold tasks to read the task explainations.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added expandable notes to task schedules in PlantDetailPanel. Notes are expanded by default (collapsedIds set starts empty). Click on a row toggles collapse. Chevron rotates to indicate state. Schedules without notes show no toggle. 5 tests, 391/391 green.
<!-- SECTION:FINAL_SUMMARY:END -->
