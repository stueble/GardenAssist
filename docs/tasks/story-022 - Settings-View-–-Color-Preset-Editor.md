---
id: STORY-022
title: Settings View – Color Preset Editor
status: Ready
assignee: []
created_date: '2026-05-04 22:44'
labels: []
dependencies: []
documentation:
  - docs/api/color-preset.ts
  - docs/api/settings.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the Farb-Presets section: user can add, edit, reorder and delete color presets per schedule type.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Presets grouped by schedule type (Blüte, Wachstum, Blätter, Schnitt, Düngung, Sonstiges)
- [ ] #2 Each preset shows color swatch + name + edit/delete actions
- [ ] #3 Add new preset: color picker + name input
- [ ] #4 Reorder via drag & drop within a group
- [ ] #5 Changes saved via updateSettings() as part of the full Settings object
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
