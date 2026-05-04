---
id: STORY-035
title: Journal – Timeline & Entry List
status: Ready
assignee: []
created_date: '2026-05-04 22:47'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-007 - 007-UX-UI-Concept-Journal.md
  - ui-mockups/journal/journal-mockup.html
  - docs/api/journal-entry.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the Journal timeline view: entries grouped by month, collapsible entry cards, search and filter chips.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Entries from Garden.journal_entries[] rendered as timeline grouped by month descending
- [ ] #2 Entry card shows: type badge, plant tag, title, date; expands on click to show notes and attachment previews
- [ ] #3 Filter chips: Erledigt, Beobachtung, Problem, Ausgabe — single active at a time
- [ ] #4 Live search filters by title, notes, and plant name
- [ ] #5 Empty state shown when no entries match
- [ ] #6 Type colors consistent with mockup (done=green, observation=blue, problem=red, expense=brown)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
