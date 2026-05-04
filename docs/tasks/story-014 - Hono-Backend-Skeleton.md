---
id: STORY-014
title: Hono Backend Skeleton
status: In Review
assignee:
  - '@agent'
created_date: '2026-05-04 17:26'
updated_date: '2026-05-04 21:44'
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
- [x] #1 Hono app created with all routes from api.ts
- [x] #2 Zod schemas derived from docs/api/*.ts types for all inputs
- [x] #3 All endpoints return valid mock data matching the TypeScript types
- [x] #4 Static file serving for attachments (/static/*)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Hono + Zod installieren
2. src/index.ts (Hono App, Server-Start, static serving)
3. src/schemas/ (Zod-Schemas fuer alle Inputs)
4. src/mock/ (Mock-Daten Hilfsfunktionen)
5. src/routes/ (garden, plants, journal, attachments, settings, export)
6. Tests (ein Test pro Route-Gruppe)
7. Typecheck + Tests gruen
8. ACs, Final Summary, In Review, Commit
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Set up the Hono backend skeleton with all routes, Zod validation, and mock responses.

Changes:
- Installed: hono, zod, @hono/zod-validator, @hono/node-server
- src/schemas/index.ts: Zod schemas for all API inputs (PlantInput, JournalEntryInput, GardenInput, SettingsSchema, ScheduleInputSchema, AttachmentInputSchema)
- src/mock/index.ts: type-safe mock data helpers for Garden, Plant, Schedule, JournalEntry, Attachment, Settings
- src/routes/garden.ts: GET/PATCH /api/garden, POST/DELETE /api/garden/plan
- src/routes/plants.ts: POST/PUT/DELETE /api/plants
- src/routes/journal.ts: POST/PUT /api/journal
- src/routes/attachments.ts: POST/DELETE /api/attachments
- src/routes/settings.ts: GET/PUT /api/settings
- src/routes/export.ts: GET /api/export/json, GET /api/export/plants.csv, POST /api/import/json
- src/index.ts: Hono app with all routes mounted + /static/* served from DATA_DIR + /health endpoint
- src/server.ts: server entry point (separated from app export to avoid port conflicts in tests)
- tsconfig.test.json: separate TS config for test files
- 18 tests across all route groups: status codes, response shapes, Zod validation rejection

Verified:
- pnpm --filter backend test: 18/18 passed
- pnpm --filter backend typecheck: no errors
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Implementation finished
- [x] #2 Test(s) added
- [x] #3 No regressions introduced
- [x] #4 Documentation updated
- [x] #5 Changes committed
<!-- DOD:END -->
