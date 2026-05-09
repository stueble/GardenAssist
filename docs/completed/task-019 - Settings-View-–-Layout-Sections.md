---
id: TASK-019
title: Settings View – Layout & Sections
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 22:44'
updated_date: '2026-05-05 16:02'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-009 - 009-UX-UI-Concept-Settings.md
  - ui-mockups/settings/settings-mockup.html
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the Settings view shell with all collapsible sections and the fixed save bar. No API connection yet — sections render with placeholder content.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Scrollable single-column layout with max-width centered
- [x] #2 All 7 sections rendered as collapsible cards: Gartenplan, Standort, Bewässerungszonen, Pflanzenkategorien, Farb-Presets, KI-Assistent, Daten & Backup
- [x] #3 Fixed save bar at bottom with Verwerfen and Speichern buttons
- [x] #4 Settings icon in nav bar navigates to this view; active state shown
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. SettingsSection collapsible Komponente
2. SaveBar Komponente
3. AiPanel Stub (ADR-006: immer rechtsseitig)
4. SettingsView: 7 Sections + SaveBar + AiPanel
5. Tests
6. Typecheck + Tests gruen, Commit
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented Settings view shell with all collapsible sections, save bar, and AI assistant panel.

Changes:
- src/components/SettingsSection.tsx: reusable collapsible card (icon, title, aria-expanded, chevron animation)
- src/components/SaveBar.tsx: fixed bottom bar with Verwerfen/Speichern buttons; disabled when no changes
- src/components/AiPanel.tsx: AI assistant panel stub (ADR-006: rightmost); vertical toggle strip + 300px expanded panel with header, welcome message, input field; context pill support
- src/views/SettingsView.tsx: 7 sections (Gartenplan, Standort, Bewässerungszonen, Pflanzenkategorien, Farb-Presets, KI-Assistent, Daten & Backup); Gartenplan open by default; SaveBar + AiPanel integrated
- locales/de/settings.json + en/settings.json: added garden_plan, irrigation_zones, plant_categories, color_presets section keys
- 17 SettingsView tests: sections visible, collapse/expand, save bar state, AI panel toggle

Note: AI panel is a visual stub — no AI connection yet. Section bodies contain placeholder text — filled in future stories.

Verified:
- 75/75 frontend tests passing
- typecheck clean
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Implementation finished
- [x] #2 Test(s) added
- [x] #3 No regressions introduced
- [x] #4 Documentation updated
- [x] #5 Changes committed
<!-- DOD:END -->
