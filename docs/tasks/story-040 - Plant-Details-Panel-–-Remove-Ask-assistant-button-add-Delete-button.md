---
id: STORY-040
title: 'Plant Details Panel – Remove Ask-assistant button, add Delete button'
status: Done
assignee:
  - '@agent'
created_date: '2026-05-06 18:39'
updated_date: '2026-05-06 18:54'
labels: []
dependencies:
  - STORY-025
documentation:
  - docs/docs/doc-005 - 005-UX-UI-Concept-Plants-Overview.md
  - docs/docs/doc-006 - 006-UX-UI-Concept-Garden-Calendar.md
  - docs/docs/doc-008 - 008-UX-UI-Concept-Plant-Edit-Dialog.md
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow deletion of a plant
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 "Ask assistant" button removed from the Plant Detail Panel in all views (Plants Overview, Calendar, Dashboard)
- [x] #2 Assistant opens automatically with plant context when a plant is selected — no button needed
- [x] #3 "Delete plant" button added at the bottom of the detail panel, visually separated from other actions (red text-link style, not a filled button)
- [x] #4 Clicking Delete shows a confirmation dialog: "Permanently delete this plant? This action cannot be undone." with Cancel and Delete actions
- [x] #5 Confirming calls deletePlant(id) — DELETE /api/plants/:id — expects 204
- [x] #6 On success: detail panel closes, plant list refreshes, deleted plant no longer appears
- [x] #7 On API failure: inline error message shown below the button; panel stays open
- [x] #8 doc-005, doc-006, doc-008 updated: Ask-assistant references removed, Delete button documented
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Assistent-Button aus PlantDetailPanel entfernt (AC #1/#2). Löschen-Button als roter Text-Link hinzugefügt (AC #3) mit Inline-Bestätigungsdialog (AC #4), deletePlant-API-Aufruf (AC #5), Erfolgs-Callback (AC #6) und Inline-Fehleranzeige (AC #7). PlantsView verdrahtet: onDelete entfernt Pflanze aus State und schließt Panel. 9 neue Tests, 186 gesamt grün. doc-005 und doc-006 aktualisiert (AC #8).
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
