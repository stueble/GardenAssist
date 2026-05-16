---
id: TASK-092
title: 'Fix migration logging: use raw SQLite client for prepare() in server.ts'
status: Done
assignee:
  - '@agent'
created_date: '2026-05-16 18:35'
updated_date: '2026-05-16 18:48'
labels: []
dependencies: []
ordinal: 89000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The migration logging added in the startup sequence uses db.prepare() but db is a Drizzle instance which does not expose prepare(). This causes a TypeScript error (TS2339) that breaks the Docker build on GitHub Actions. Fix by exporting the raw better-sqlite3 client from db/index.ts and using it in server.ts for the migration count queries.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 db/index.ts exports the raw better-sqlite3 client as 'client' alongside the existing 'db' Drizzle export
- [x] #2 server.ts imports 'client' from db/index.ts and uses client.prepare() instead of db.prepare() in countAppliedMigrations()
- [x] #3 pnpm --filter backend build completes without TypeScript errors
- [ ] #4 GitHub Actions build passes
- [ ] #5 Migration logging still works correctly on container start: 'Migrations: N applied (M total)' is printed
- [x] #6 No regression — existing db export and all routes that use db are unchanged
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Exported the raw better-sqlite3 instance as 'client' from db/index.ts. Updated server.ts to import 'client' and use client.prepare() in countAppliedMigrations(). Backend build and typecheck pass cleanly. No regression — 'db' export and all routes unchanged.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
