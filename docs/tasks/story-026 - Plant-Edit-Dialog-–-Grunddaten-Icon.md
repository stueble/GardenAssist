---
id: STORY-026
title: Plant Edit Dialog – Grunddaten & Icon
status: Ready
assignee: []
created_date: '2026-05-04 22:45'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-008 - 008-UX-UI-Concept-Plant-Edit-Dialog.md
  - ui-mockups/plant-edit/plant-edit-mockup.html
  - docs/api/plant.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the Plant Edit Dialog shell and the Grunddaten section: all scalar plant fields plus the SVG icon picker. Opened from FAB (new) or Bearbeiten button (edit).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Dialog opens as left panel following ADR-006 layout order
- [ ] #2 All Grunddaten fields: name, botanical name, origin type, category, lifecycle, description, care notes, sun demand, water demand, soil type, frost tolerance, temperature protected, health status, location, watering zone, purchase date, purchase price
- [ ] #3 Icon picker shows SVG options from icon library; auto-suggestion based on plant name
- [ ] #4 Dropdowns for origin_type, lifecycle, sun_demand, water_demand, soil_type populated from i18n locale labels
- [ ] #5 Category and watering_zone dropdowns populated from Settings
- [ ] #6 Abbrechen closes dialog with unsaved-changes confirmation if dirty
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
