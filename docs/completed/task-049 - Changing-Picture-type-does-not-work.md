---
id: TASK-049
title: Changing Picture type does not work
status: Done
assignee:
  - '@agent'
created_date: '2026-05-08 23:12'
updated_date: '2026-05-08 23:20'
labels:
  - bug
dependencies: []
ordinal: 47000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Edit plant, change attachement type, save changes. If you reopen the edit dialog, the picture still has the old type.
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
Zwei Ursachen:
1. AttachmentInputSchema (schemas/index.ts) enthielt kein id-Feld — Zod strippte die ID beim Validieren, sodass der Service nicht wusste welches Attachment zu updaten ist.
2. updatePlant (plant.service.ts) iterierte data.attachments gar nicht — die Kategorie wurde nie in die DB geschrieben.

Fix: id zu AttachmentInputSchema hinzugefügt; updatePlant updatet jetzt für jedes übergebene Attachment die category per ID. Außerdem evergreen aus dem Lifecycle-Enum im Schema entfernt (war noch verblieben).

Neue Tests in plant.service.test.ts verifizieren den Fix.
<!-- SECTION:FINAL_SUMMARY:END -->
