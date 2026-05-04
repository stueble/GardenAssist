---
id: STORY-021
title: Settings View – Garden Plan Upload
status: Ready
assignee: []
created_date: '2026-05-04 22:44'
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

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
