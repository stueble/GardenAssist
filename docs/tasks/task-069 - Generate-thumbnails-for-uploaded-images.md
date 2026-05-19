---
id: TASK-069
title: Generate thumbnails for uploaded images
status: Ready
assignee: []
created_date: '2026-05-10 21:39'
updated_date: '2026-05-19 21:34'
labels:
  - improvement
dependencies: []
priority: low
ordinal: 73000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Uploaded plant photos are currently stored and served at full resolution. When images are displayed in small contexts (garden plan pins, attachment previews, plant cards), loading full-size files is wasteful. The backend should generate a small thumbnail on upload and expose it via a separate URL, so the frontend can request an appropriately sized version.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The attachment API response includes a thumbnail_url field alongside the existing url field
- [ ] #2 Thumbnails are stored in the same data directory as originals (DATA_DIR) and served via the existing /static/ route
- [ ] #3 Existing attachments without a thumbnail fall back gracefully (thumbnail_url is null; frontend uses url)
- [ ] #4 The Plant API type (docs/api/attachment.ts) is updated to include the optional thumbnail_url field
- [ ] #5 On image upload, the backend generates a thumbnail (longest edge: 400 px) always encoded as progressive JPEG (quality 82) regardless of the original format
- [ ] #6 All <img> tags that render thumbnail_url in table and list views carry loading="lazy"
- [ ] #7 PNG uploads produce a progressive JPEG thumbnail (.jpg suffix); the thumbnail_url in the API response reflects the .jpg path
<!-- AC:END -->



## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
