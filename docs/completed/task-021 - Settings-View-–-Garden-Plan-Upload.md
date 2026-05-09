---
id: TASK-021
title: Settings View – Garden Plan Upload
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 22:44'
updated_date: '2026-05-05 16:51'
labels: []
dependencies: []
documentation:
  - docs/api/api.ts
  - docs/docs/doc-009 - 009-UX-UI-Concept-Settings.md
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement garden plan image upload and removal in the Settings → Gartenplan section.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Drag & drop and click-to-upload supported (PNG, JPG, SVG)
- [x] #2 Preview row shows thumbnail, filename, file size and upload date after upload
- [x] #3 Remove button deletes plan and returns to dropzone state
- [x] #4 uploadGardenPlan() and deleteGardenPlan() API methods used
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Backend: POST /api/garden/plan und DELETE /api/garden/plan real implementieren
2. Frontend: useGardenPlan-Hook erstellen
3. Frontend: GardenPlanSection-Komponente erstellen (Dropzone + Preview)
4. SettingsView: Platzhalter durch GardenPlanSection ersetzen
5. i18n: Neue Keys in de/en settings.json
6. Tests: Backend-Route-Tests + Frontend-Render-Tests
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Garden plan upload and removal fully implemented.

Backend: POST /api/garden/plan saves file to data/garden/plan.<ext> and updates DB; DELETE /api/garden/plan removes file and clears DB. DATA_DIR resolved at call time for testability.

Frontend: new useGardenPlan hook fetches plan state from getGarden(); new GardenPlanSection component shows dropzone (no plan) or preview row (plan exists) with drag&drop + click-to-upload and remove button. SettingsView placeholder replaced.

i18n: new garden_plan keys added to de/en settings.json.

Tests: 7 backend route tests (upload/delete/validation/file-system), 8 frontend component tests (dropzone state, preview state, API calls, state transitions). All tests green (63 backend, 75 frontend).
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
