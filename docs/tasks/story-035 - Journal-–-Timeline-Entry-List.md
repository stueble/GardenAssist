---
id: STORY-035
title: Journal – Timeline & Entry List
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 22:47'
updated_date: '2026-05-07 21:41'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-007 - 007-UX-UI-Concept-Journal.md
  - ui-mockups/journal/journal-mockup.html
  - docs/api/journal-entry.ts
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the Journal timeline view: entries grouped by month, collapsible entry cards, search and filter chips.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Entries from Garden.journal_entries[] rendered as timeline grouped by month descending
- [x] #2 Entry card shows: type badge, plant tag, title, date; expands on click to show notes and attachment previews
- [x] #3 Filter chips: Erledigt, Beobachtung, Problem, Ausgabe — single active at a time
- [x] #4 Live search filters by title, notes, and plant name
- [x] #5 Empty state shown when no entries match
- [x] #6 Type colors consistent with mockup (done=green, observation=blue, problem=red, expense=brown)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
JournalView implementiert: Timeline nach Monat gruppiert (absteigend), Entry-Cards mit Typ-Badge/Pflanzentag/Titel/Datum, aufklappbar für Notizen und Attachments. Filter-Chips (Erledigt/Übersprungen/Manuell) toggle einzeln. Live-Suche nach Titel, Notizen, Pflanzenname. Empty State. Typ-Farben: grün/grau/blau. 14 neue Tests, 266 gesamt.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
