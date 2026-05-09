---
id: TASK-022
title: Settings View – Color Preset Editor
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 22:44'
updated_date: '2026-05-09 17:37'
labels:
  - user story
dependencies: []
documentation:
  - docs/api/color-preset.ts
  - docs/api/settings.ts
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the Farb-Presets section: user can add, edit, reorder and delete color presets per schedule type.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Presets grouped by schedule type (Blüte, Wachstum, Blätter, Schnitt, Düngung, Sonstiges)
- [x] #2 Each preset shows color swatch + name + edit/delete actions
- [x] #3 Add new preset: color picker + name input
- [x] #4 Reorder via drag & drop within a group
- [x] #5 Changes saved via updateSettings() as part of the full Settings object
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. ColorPresetsSection-Komponente: 6 Gruppen, je Preset-Eintrag (Swatch + Name + Color-Picker + Delete)
2. Drag & Drop für Reorder innerhalb einer Gruppe (HTML5 drag API, kein externe Library)
3. i18n-Keys für alle 6 Schedule-Type-Labels (de + en)
4. SettingsView: Platzhalter ersetzen
5. Tests
6. Commit
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Neue Komponente ColorPresetsSection mit 6 Gruppen (bloom, growth, foliage, pruning, fertilization, misc). Jeder Preset-Eintrag zeigt: klickbaren Farbswatch (öffnet nativen Color-Picker), Name-Input, natives color-Input und Delete-Button. Drag & Drop zur Neuordnung innerhalb einer Gruppe per HTML5 Drag API (keine externe Library). 'Farbe hinzufügen'-Button mit zufälliger Startfarbe. Alle Änderungen fließen via onChange() in den Settings-Form-State und werden mit 'Speichern' via updateSettings() persistiert. 12 Tests, alle grün.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
