---
id: TASK-051
title: delete journal entry
status: Done
assignee:
  - '@agent'
created_date: '2026-05-08 23:16'
updated_date: '2026-05-09 00:37'
labels:
  - user story
dependencies: []
ordinal: 49000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a user, I want to be able to delete a journal entry. A possible way would be to add a botton to the edit dialog, but the UX/UI can be discussed
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The user has to confirm deletion of the journal entry
- [ ] #2 Journal entry is deleted
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. DELETE /api/journal/:id Route hinzufügen
2. deleteJournalEntry() zu API-Typ + client.ts
3. Löschen-Button im EntryPanel-Footer (nur Edit-Modus)
4. Bestätigung via confirm()
5. i18n: delete/confirm Keys in de+en
6. Tests
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Delete-Journal-Entry Feature implementiert.

Backend: DELETE /api/journal/:id Route hinzugefügt — löscht den Eintrag und die junction_entry_attachments Zeilen explizit (FK cascade würde es auch tun, aber explizit ist sicherer). 404 wenn nicht gefunden.

API-Typ: deleteJournalEntry(id) zu Api-Interface und client.ts hinzugefügt. Alter Kommentar "cannot be deleted" entfernt.

i18n: Neue "actions"-Keys in de/journal.json und en/journal.json (delete, delete_confirm, delete_error).

Frontend: Löschen-Button im EntryPanel-Footer (nur im Edit-Modus, nicht bei neuen Einträgen). Einfaches Bestätigungs-confirm() via t(). Roter Outline-Button unterhalb der Hauptaktionen. onDeleted-Callback schließt Panel und lädt Liste neu.

Tests: 2 neue Backend-Route-Tests (204 bei erfolgreichem Löschen + Verifizierung via getGarden, 404 bei nicht existierendem Eintrag).
<!-- SECTION:FINAL_SUMMARY:END -->
