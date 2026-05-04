---
id: STORY-014
title: Hono Backend Skeleton
status: Ready
assignee: []
created_date: '2026-05-04 17:26'
updated_date: '2026-05-04 17:28'
labels:
  - setup
dependencies: []
documentation:
  - docs/api/api.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Set up the Hono backend with all API endpoints from docs/api/api.ts returning mock data. No business logic yet — just routing and Zod validation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Hono app created with all routes from api.ts
- [ ] #2 Zod schemas derived from docs/api/*.ts types for all inputs
- [ ] #3 All endpoints return valid mock data matching the TypeScript types
- [ ] #4 Static file serving for attachments (/static/*)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
