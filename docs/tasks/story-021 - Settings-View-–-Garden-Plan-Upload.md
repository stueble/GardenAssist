---
id: STORY-021
title: Settings View – Garden Plan Upload
status: In Progress
assignee:
  - '@agent'
created_date: '2026-05-04 22:44'
updated_date: '2026-05-05 16:15'
labels: []
dependencies: []
documentation:
  - docs/api/api.ts
  - docs/docs/doc-009 - 009-UX-UI-Concept-Settings.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement garden plan image upload and removal in the Settings → Gartenplan section.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Drag & drop and click-to-upload supported (PNG, JPG, SVG)
- [ ] #2 Preview row shows thumbnail, filename, file size and upload date after upload
- [ ] #3 Remove button deletes plan and returns to dropzone state
- [ ] #4 uploadGardenPlan() and deleteGardenPlan() API methods used
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

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
