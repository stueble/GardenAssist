---
id: TASK-052
title: Use topmost picture to generate plant icon.
status: Done
assignee: []
created_date: '2026-05-08 23:18'
updated_date: '2026-05-08 23:46'
labels:
  - bug
dependencies: []
ordinal: 48000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The table views do not show the topmost picture in the attachement list.
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
Zwei Fixes:

1. PlantEditDialog handleSave: thumbnail_attachment_id wurde bisher auf das erste Attachment mit category="main" gesetzt — das ignorierte die Reihenfolge zugunsten der Kategorie. Fix: erstes Bild (attachment_type="image") in der Liste wird jetzt als Thumbnail verwendet, unabhängig von der Kategorie. Der User kontrolliert die Reihenfolge selbst.

2. PlantCard: fehlende Fallback-Logik wenn thumbnail_attachment_id gesetzt aber das referenzierte Bild nicht (mehr) vorhanden ist. PlantCard zeigte in diesem Fall sofort das Emoji-Fallback, während PlantRow korrekt auf das nächste verfügbare Bild zurückfiel. PlantCard-Logik angeglichen.
<!-- SECTION:FINAL_SUMMARY:END -->
