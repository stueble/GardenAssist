---
id: TASK-075
title: >-
  Rename 'temperature_protected' label to 'Cold protection / Indoor' and show
  badge in UI
status: Done
assignee:
  - '@agent'
created_date: '2026-05-11 20:34'
updated_date: '2026-05-11 21:33'
labels:
  - frontend
  - i18n
dependencies: []
documentation:
  - apps/frontend/src/locales/de/plants.json
  - apps/frontend/src/locales/en/plants.json
  - apps/frontend/src/components/PlantEditDialog.tsx
priority: medium
ordinal: 70000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The boolean flag `temperature_protected` on Plant is currently mislabeled as "Frostschutz nötig". The correct intent of the flag is to mark a plant as sheltered (moved indoors, under cover, etc.) so that no cold/frost warnings are generated for it in the dashboard.

This story renames the label across all i18n files and adds a small visual badge in PlantDetailPanel and PlantCard so the user can see at a glance that the plant is protected from cold.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Rename i18n key in de/plants.json — edit.field_frost and fields.temperature_protected → 'Kälteschutz/Indoor'
- [x] #2 Rename i18n key in en/plants.json — edit.field_frost and fields.temperature_protected → 'Cold protection / Indoor'
- [x] #3 Add new i18n key detail.protected_badge: 'Kälteschutz/Indoor' (de) / 'Cold protection / Indoor' (en)
- [x] #4 PlantDetailPanel: render a pill badge '🏠 <protected_badge>' in the Steckbrief fact grid, directly below the Min. Temperatur row, only when temperature_protected === true
- [x] #5 PlantCard (card view): show a small 🏠 icon badge on the card when temperature_protected === true
- [x] #6 No frost/cold dashboard warnings are generated for plants where temperature_protected === true (verify existing behaviour is unchanged)
- [x] #7 Tests added or updated for badge rendering in PlantDetailPanel and PlantCard
- [x] #8 No regressions in existing test suite
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Renamed temperature_protected labels in both locales (de/en) from 'Frostschutz nötig' / 'Needs frost protection' to 'Kälteschutz/Indoor' / 'Cold protection / Indoor' in fields.*, edit.field_frost. Added new detail.protected_badge key. PlantDetailPanel shows a blue pill badge '🏠 Kälteschutz/Indoor' below the fact grid when temperature_protected=true. PlantCard shows a compact 🏠 badge in the badge row. AC #6 verified: existing frost warning logic unchanged. 4 new tests added (2 panel, 2 card). 477/477 pass, typecheck clean.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
