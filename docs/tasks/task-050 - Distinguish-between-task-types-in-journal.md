---
id: TASK-050
title: Distinguish between task types in journal
status: In Review
assignee:
  - '@agent'
created_date: '2026-05-08 23:15'
updated_date: '2026-05-11 15:26'
labels:
  - bug
dependencies: []
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
At the moment the journal view only allows the user to add a task of type "done". However, since the concrete taks type is not specified, the system vcannot use this task to derive the due dates of existing schedules.

As a user, I want to be able to manually add a finished task even if it is not yet shown in the task list. Moreover, a user wants to add a finished task to the journal entry of type misc  that is completly unrelated to schedules.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The user can manually add a journal entry based on a schedule of a plant that is identical to automatically created journal entries created when the user clicks the "done" button
that is technically identical to a task automatically created based on a schedule.
- [x] #2 The user can add a journal entry of type misc that is completely unrelated to existing schedules.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Backend: deriveTasks filtert Journal-Einträge für die Task-Resolution auf die letzten 26 Wochen (date >= heute - 182 Tage), damit Aufgaben im nächsten Jahr wieder erscheinen. Frontend: EntryPanel komplett überarbeitet — "manual"-Typ wählbar (AC #2), Schedule-Picker erscheint wenn eine Pflanze mit Care-Zeitplänen ausgewählt wird (AC #1), bei Zeitplanauswahl werden done/skipped als Typen angeboten und schedule_id korrekt beim Speichern übergeben. Alle Hard-coded Strings auf t() umgestellt. 5 neue Frontend-Tests + 3 neue Backend-Tests. 423/423 Frontend + 123/123 Backend grün.
<!-- SECTION:FINAL_SUMMARY:END -->
