---
id: STORY-027
title: Plant Edit Dialog – Schedules
status: In Progress
assignee:
  - '@agent'
created_date: '2026-05-04 22:45'
updated_date: '2026-05-06 18:34'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-008 - 008-UX-UI-Concept-Plant-Edit-Dialog.md
  - docs/api/schedule.ts
  - docs/api/color-preset.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement all schedule sections in the Plant Edit Dialog: Blütezeiten, Wachstum, Blätter, Schnittzeiten, Düngezeiten, Sonstiges. Each section allows adding, editing and removing schedule entries.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Each schedule type rendered as a collapsible section with colored accent
- [x] #2 Add entry button creates a new schedule row with start_week, end_week, color picker, and label
- [x] #3 Color picker shows ColorPresets for the schedule type from Settings
- [x] #4 Week range input validates start_week and end_week (1–52); year-wrap (start > end) visually indicated
- [x] #5 Delete button removes a schedule entry
- [x] #6 Entry count badge shown in collapsed section header
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
PlantEditDialog um alle 6 Schedule-Sektionen erweitert (Blütezeiten, Wachstum, Blätter, Schnittzeiten, Düngezeiten, Sonstiges). Neue Komponenten: ScheduleSection, ScheduleEntryRow, ColorPopup. EditSection um count-Badge-Prop erweitert. Wochenpicker mit 48 Optionen (W1 Jan–W4 Dez), Jahresübergang-Indikator (↻), Farb-Picker mit Settings-Presets für bloom/foliage/misc, Auto-Label bei Bloom-Preset-Auswahl. schedules werden im Speichern-Payload übertragen. 16 neue Tests, 177 gesamt grün.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
