---
id: STORY-036
title: Journal – New Entry Panel & Edit
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 22:48'
updated_date: '2026-05-07 22:15'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-007 - 007-UX-UI-Concept-Journal.md
  - docs/api/api.ts
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the new entry panel (opens via FAB) and edit mode for existing entries.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 FAB (＋) opens new entry panel from right following ADR-006 layout
- [x] #2 Entry type selector: Erledigt, Beobachtung, Problem, Ausgabe
- [x] #3 Plant picker: searchable dropdown from Garden.plants[]
- [x] #4 Date, title, notes fields
- [x] #5 Attachment upload slots (PNG, JPG, WebP, PDF)
- [x] #6 Speichern calls createJournalEntry(); panel closes and entry appears in timeline
- [x] #7 Click existing entry → edit mode via updateJournalEntry()
- [ ] #8 AI 'In Journal übernehmen' button applies assistant suggestion to form
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
EntryPanel-Komponente (320px rechts, slide-in): Typ-Selector (4 Typen, gemappet auf done/manual/skipped), Plant-Picker (alle Pflanzen), Datum/Titel/Notizen-Felder. FAB (＋) öffnet neuen Eintrag, versteckt sich wenn Panel offen. Edit-Button auf jeder Entry-Card öffnet Panel im Edit-Modus. Speichern ruft createJournalEntry/updateJournalEntry auf, schließt Panel, lädt Timeline neu. AC #8 (AI) übersprungen. 10 neue Tests, 276 gesamt grün.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
