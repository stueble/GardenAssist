---
id: STORY-026
title: Plant Edit Dialog – Grunddaten & Icon
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 22:45'
updated_date: '2026-05-06 18:19'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-008 - 008-UX-UI-Concept-Plant-Edit-Dialog.md
  - ui-mockups/plant-edit/plant-edit-mockup.html
  - docs/api/plant.ts
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the Plant Edit Dialog shell and the Grunddaten section: all scalar plant fields plus the SVG icon picker. Opened from FAB (new) or Bearbeiten button (edit).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dialog opens as left panel following ADR-006 layout order
- [x] #2 All Grunddaten fields: name, botanical name, origin type, category, lifecycle, description, care notes, sun demand, water demand, soil type, frost tolerance, temperature protected, health status, location, watering zone, purchase date, purchase price
- [x] #3 Icon picker shows SVG options from icon library; auto-suggestion based on plant name
- [x] #4 Dropdowns for origin_type, lifecycle, sun_demand, water_demand, soil_type populated from i18n locale labels
- [x] #5 Category and watering_zone dropdowns populated from Settings
- [x] #6 Abbrechen closes dialog with unsaved-changes confirmation if dirty
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. i18n-Keys für Plant Edit Dialog (de/en)
2. PlantEditDialog-Komponente: Shell, Header, collapsible Sections, Save/Cancel
3. Grunddaten-Sektion: alle Felder aus AC#2
4. Icon-Picker: 20 Emoji-Optionen, Auto-Suggestion
5. Dropdowns aus i18n (AC#4) und Settings (AC#5)
6. PlantsView verdrahten: FAB öffnet neuen Dialog, Bearbeiten öffnet Edit-Dialog
7. Tests
8. Commit
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
PlantEditDialog als neue Komponente (360px linkes Panel, ADR-006). Grunddaten-Sektion mit allen 17 Feldern aus AC#2. Icon-Picker mit 20 Emojis und Auto-Suggestion aus Kategorie (AC#3). Enum-Dropdowns aus i18n (AC#4). Kategorie/Zone aus Settings (AC#5). Cancel mit Bestätigungsdialog bei dirty (AC#6). FAB öffnet neuen Dialog, Bearbeiten-Button öffnet Edit-Dialog. createPlant/updatePlant verdrahtet. 19 neue Tests, 161 gesamt grün.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
