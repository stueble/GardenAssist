---
id: TASK-020
title: Settings View – API Integration
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 22:44'
updated_date: '2026-05-05 16:02'
labels: []
dependencies: []
documentation:
  - docs/api/settings.ts
  - docs/api/api.ts
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Connect the Settings view to getSettings() and updateSettings() API endpoints. All fields read from and write to the API.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All fields populated from getSettings() on load
- [x] #2 Speichern calls updateSettings() with complete Settings object
- [x] #3 Verwerfen resets all fields to last saved state
- [x] #4 Success and error feedback shown after save
- [x] #5 Language switch (de/en) takes effect immediately without page reload
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Backend settings.service.ts (getSettings, updateSettings mit DB)
2. Backend settings Route auf Service umstellen
3. Frontend useSettings Hook (load, dirty, save, discard)
4. Felder in Sections: Sprache, Standort, Zonen, Kategorien, KI-Assistent, Daten & Backup
5. SaveBar Feedback (Erfolg/Fehler)
6. Language switch sofort aktiv
7. Tests
8. Typecheck + Tests gruen, Commit
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Connected the Settings view to real getSettings() and updateSettings() API endpoints.

Backend:
- services/settings.service.ts: getSettings() reads settings + color_presets from DB; updateSettings() persists all fields, replaces color_presets (delete+insert)
- routes/settings.ts: GET/PUT use real service instead of mock
- 8 service tests: defaults, fallback, all field types, color_preset replacement

Frontend:
- hooks/useSettings.ts: loads settings on mount, tracks dirty state, save/discard, success/error status with auto-clear
- components/settings/FieldInput.tsx: shared field components (FieldLabel, FieldInput, FieldSelect, FieldHint, FieldRow, ListEntry, AddRowButton) matching mockup styles
- components/settings/LocationSection.tsx: city + zip fields
- components/settings/ZonesSection.tsx: editable list of irrigation zones
- components/settings/CategoriesSection.tsx: editable list of plant categories
- components/settings/AiSection.tsx: api key + model selector + test connection button
- components/settings/DataSection.tsx: export/import/delete actions
- SaveBar: status prop (saving/success/error) with auto-clear feedback
- SettingsView: wired to useSettings hook, language switch via i18n on change (AC #5)
- Gartenplan + Farb-Presets sections remain as placeholders (story-021/022)
- 9 integration tests covering all ACs

Verified:
- 67/67 frontend tests, 56/56 backend tests
- both typecheck clean
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Implementation finished
- [x] #2 Test(s) added
- [x] #3 No regressions introduced
- [x] #4 Documentation updated
- [x] #5 Changes committed
<!-- DOD:END -->
