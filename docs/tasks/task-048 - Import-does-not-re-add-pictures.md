---
id: TASK-048
title: Import does not re-add pictures
status: Done
assignee:
  - '@agent'
created_date: '2026-05-08 22:34'
updated_date: '2026-05-08 23:12'
labels:
  - bug
dependencies: []
ordinal: 45000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When re-importing data, pictures are not restored.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Beim Import fehlende Attachment-DB-Einträge aus der URL rekonstruieren
2. owner_type und owner_id aus dem URL-Pfad parsen
3. attachment_type aus der Dateiendung ableiten
4. Tests ergänzen
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Bilder wurden beim Import nicht wiederhergestellt.

Ursache: importJsonData übersprang fehlende Attachment-DB-Einträge komplett. Schritt 0 kannte owner_type/owner_id nicht (nicht Teil des Attachment-API-Typs).

Fix: Attachments werden jetzt aus allen Quellen gesammelt (Garden.attachments enthält garden- und journal_entry-Attachments; Plant[].attachments enthält plant-Attachments). owner_type und owner_id werden aus der URL geparst (/static/attachments/{owner_type}/{owner_id}/{file}). Fehlende DB-Einträge werden als vollständige Rows wiederhergestellt.

Verifiziert via echtem HTTP-Roundtrip: Upload → Export → Delete-All → Import → Bild wieder da.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
