---
id: STORY-013
title: Drizzle Schema & Database Setup
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 17:25'
updated_date: '2026-05-04 21:39'
labels:
  - setup
dependencies: []
documentation:
  - docs/docs/doc-010 - 010-Data-Model.md
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Define the database schema in Drizzle ORM based on doc-010. Schema covers all tables: plants, schedules, journal_entries, attachments, etc.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Drizzle installed and configured for SQLite and PostgreSQL
- [x] #2 All tables from doc-010 implemented as Drizzle schema
- [x] #3 Initial migration generated and applied
- [x] #4 Seed script creates default Settings and ColorPresets
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Dependencies installieren
2. src/db/schema.ts (alle Tabellen aus doc-010)
3. src/db/index.ts (SQLite vs PostgreSQL via DATABASE_URL)
4. drizzle.config.ts
5. Migration generieren + anwenden
6. src/db/seed.ts (settings + garden Singleton-Zeilen)
7. Tests
8. ACs, Final Summary, In Review, Commit
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented Drizzle ORM schema and database setup for GardenAssist.

Changes:
- Installed drizzle-orm, better-sqlite3, postgres, drizzle-kit, tsx, vitest
- apps/backend/src/db/schema.ts: all 9 tables from doc-010 (plants, plant_positions, schedules, journal_entries, attachments, journal_entry_attachments, color_presets, garden, settings)
- apps/backend/src/db/index.ts: SQLite by default (DATABASE_URL=file:...), PostgreSQL via dynamic import for async use
- apps/backend/drizzle.config.ts: dialect switches automatically based on DATABASE_URL
- apps/backend/drizzle/0000_hard_inertia.sql: initial migration (generated + applied)
- apps/backend/src/db/seed.ts: idempotent seed — inserts garden and settings singleton rows via onConflictDoNothing
- apps/backend/src/db/__tests__/schema.test.ts: 5 tests covering singleton creation, default values, seed idempotency, plant insert/retrieve, empty DB state
- package.json: scripts db:generate, db:migrate, db:seed, db:studio, test
- tsconfig.json: rootDir fixed to support docs/api path alias; noUnusedLocals disabled for shared API types
- package.json (root): pnpm onlyBuiltDependencies for better-sqlite3 and esbuild
- dev script updated from node --experimental-strip-types to tsx (Node 20 compatibility)

Verified:
- pnpm --filter backend test: 5/5 passed
- pnpm --filter backend typecheck: no errors
- pnpm --filter backend db:seed: Seed complete.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Implementation finished
- [x] #2 Test(s) added
- [x] #3 No regressions introduced
- [x] #4 Documentation updated
- [x] #5 Changes committed
<!-- DOD:END -->
