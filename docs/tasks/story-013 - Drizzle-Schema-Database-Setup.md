---
id: STORY-013
title: Drizzle Schema & Database Setup
status: Ready
assignee: []
created_date: '2026-05-04 17:25'
updated_date: '2026-05-04 17:28'
labels:
  - setup
dependencies: []
documentation:
  - docs/docs/doc-010 - 010-Data-Model.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Define the database schema in Drizzle ORM based on doc-010. Schema covers all tables: plants, schedules, journal_entries, attachments, etc.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Drizzle installed and configured for SQLite and PostgreSQL
- [ ] #2 All tables from doc-010 implemented as Drizzle schema
- [ ] #3 Initial migration generated and applied
- [ ] #4 Seed script creates default Settings and ColorPresets
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
