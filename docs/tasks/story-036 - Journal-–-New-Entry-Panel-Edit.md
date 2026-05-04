---
id: STORY-036
title: Journal – New Entry Panel & Edit
status: Ready
assignee: []
created_date: '2026-05-04 22:48'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-007 - 007-UX-UI-Concept-Journal.md
  - docs/api/api.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the new entry panel (opens via FAB) and edit mode for existing entries.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 FAB (＋) opens new entry panel from right following ADR-006 layout
- [ ] #2 Entry type selector: Erledigt, Beobachtung, Problem, Ausgabe
- [ ] #3 Plant picker: searchable dropdown from Garden.plants[]
- [ ] #4 Date, title, notes fields
- [ ] #5 Attachment upload slots (PNG, JPG, WebP, PDF)
- [ ] #6 Speichern calls createJournalEntry(); panel closes and entry appears in timeline
- [ ] #7 Click existing entry → edit mode via updateJournalEntry()
- [ ] #8 AI 'In Journal übernehmen' button applies assistant suggestion to form
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
