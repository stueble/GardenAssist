---
id: STORY-029
title: Plant Edit Dialog – Attachments & Save
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 22:46'
updated_date: '2026-05-06 21:35'
labels: []
dependencies: []
documentation:
  - docs/api/api.ts
  - docs/api/attachment.ts
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the Bilder section (attachment upload) and the final Save action that calls createPlant() or updatePlant().
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Image slots for main, bloom, leaf with upload button and category selector
- [x] #2 PDF upload supported (invoice category)
- [x] #3 Thumbnail controlled via thumbnail_attachment_id (first uploaded = default)
- [x] #4 Delete attachment removes it from list
- [x] #5 Speichern calls createPlant() for new plants or updatePlant() for existing
- [x] #6 On success: dialog closes, plant list refreshes, new plant highlighted in table
- [ ] #7 AI 'In Dialog übernehmen' button applies assistant suggestions to form fields
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
BilderSection implementiert: Datei-Picker (Bild + PDF), Kategorie-Dropdown (main/bloom/leaf/problem/invoice), Thumbnail-Vorschau, 'neu'-Badge für noch nicht hochgeladene Dateien. Bestehende Attachments aus plant.attachments vorbelegt. Löschen ruft deleteAttachment sofort auf. Speichern: create/updatePlant → dann Promise.all(uploadAttachment) für alle lokalen Files. thumbnail_attachment_id = erste 'main'-Kategorie. AC #7 (AI) übersprungen (kein Backend). 8 neue Tests, 217 gesamt grün.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
