---
id: STORY-029
title: Plant Edit Dialog – Attachments & Save
status: Ready
assignee: []
created_date: '2026-05-04 22:46'
labels: []
dependencies: []
documentation:
  - docs/api/api.ts
  - docs/api/attachment.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the Bilder section (attachment upload) and the final Save action that calls createPlant() or updatePlant().
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Image slots for main, bloom, leaf with upload button and category selector
- [ ] #2 PDF upload supported (invoice category)
- [ ] #3 Thumbnail controlled via thumbnail_attachment_id (first uploaded = default)
- [ ] #4 Delete attachment removes it from list
- [ ] #5 Speichern calls createPlant() for new plants or updatePlant() for existing
- [ ] #6 On success: dialog closes, plant list refreshes, new plant highlighted in table
- [ ] #7 AI 'In Dialog übernehmen' button applies assistant suggestions to form fields
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
