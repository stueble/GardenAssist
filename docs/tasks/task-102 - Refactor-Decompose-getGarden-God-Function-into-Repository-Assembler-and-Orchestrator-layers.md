---
id: TASK-102
title: >-
  Refactor: Decompose getGarden() God-Function into Repository, Assembler and
  Orchestrator layers
status: Ready
assignee: []
created_date: '2026-05-19 20:40'
labels:
  - backend
  - refactoring
  - tech-debt
  - architecture
dependencies: []
priority: medium
ordinal: 99000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

apps/backend/src/services/garden.service.ts contains a single ~100-line
getGarden() function that simultaneously handles four distinct concerns:

### 1. Data access (6 raw DB queries)
  db.select().from(schema.settings).all()
  db.select().from(schema.plants).all()
  db.select().from(schema.plantPositions).where(...).all()
  db.select().from(schema.schedules).where(...).all()
  db.select().from(schema.journalEntries).all()
  db.select().from(schema.attachments).orderBy(...).all()
  db.select().from(schema.journalEntryAttachments).all()

### 2. In-memory index construction (5 lookup maps)
  groupBy(positionRows,    r => r.plant_id)
  groupBy(scheduleRows,    r => r.plant_id)
  groupBy(journalEntryRows.filter(...), r => r.plant_id)
  groupBy(attachmentRows.filter(...),   r => r.owner_id)
  groupBy(jeAttachRows,    r => r.journal_entry_id)

### 3. Row-to-API-type mapping (already partially extracted as mapXxx functions)
  mapPosition(), mapSchedule(), mapJournalEntry(), mapAttachment()
  — but these private helpers are still tightly coupled inside the same file

### 4. Business logic orchestration
  deriveTasks({ schedules, journalEntries, lookbackWeeks, lookaheadWeeks })
  Warning generation
  Sorting of journal entries by date

All four concerns live in one function with one reason to change — making
every layer harder to test, reason about, and extend independently.

## Critical secondary issue: broken PostgreSQL support

The Db type is hardcoded to BetterSQLite3Database:

  type Db = BetterSQLite3Database<typeof schema>;

ADR-008 explicitly lists PostgreSQL as a supported backend (via DATABASE_URL).
But the PostgreSQL Drizzle type is PostgresJsDatabase<typeof schema> — a
completely different generic. Any PostgreSQL user hits a TypeScript (or silent
runtime) error the moment they call getGarden().

The function signature accepts a concrete driver type rather than a
driver-agnostic query interface, making the dual-database promise in the README
and ADR-008 effectively a documentation lie today.

## Proposed solution: three-layer separation

### Layer 1 — GardenRepository (data access only)
  Pure DB queries, zero business logic, injectable db instance.
  Returns raw row collections — no API types, no derivation.

  interface GardenRepository {
    loadSettings():           SettingsRow | undefined;
    loadGardenMeta():         GardenRow   | undefined;
    loadPlants():             PlantRow[];
    loadPositions(ids):       PositionRow[];
    loadSchedules(ids):       ScheduleRow[];
    loadJournalEntries():     JournalEntryRow[];
    loadAttachments():        AttachmentRow[];
    loadJeAttachments():      JeAttachmentRow[];
  }

### Layer 2 — GardenAssembler (mapping + index construction)
  Pure functions, no DB dependency, fully unit-testable without a database.
  The existing mapXxx helpers move here and become exported.

  assembleGarden(rows: RawRows, window: TaskWindow): Garden

### Layer 3 — Orchestrator (thin coordinator)
  The new getGarden() becomes a 5-line coordinator:

  export async function getGarden(db: Db): Promise<Garden> {
    const repo = new GardenRepository(db);
    const rows = await repo.loadAll();
    return assembleGarden(rows, getTaskWindow(rows.settings));
  }

### Fix for the Db type

Replace the concrete driver type with a union or structural interface
that covers both SQLite and PostgreSQL Drizzle instances:

  type Db = BetterSQLite3Database<typeof schema>
          | PostgresJsDatabase<typeof schema>;

Or introduce a repository interface with a factory function that accepts
either driver, keeping the service layer fully database-agnostic.

## Affected files

- apps/backend/src/services/garden.service.ts  (primary target)
- apps/backend/src/services/tasks.ts           (no change expected, already pure)
- apps/backend/src/routes/garden.ts            (no change expected)
- apps/backend/src/db/index.ts                 (Db type export)
- apps/backend/src/services/__tests__/garden.service.test.ts  (tests should simplify)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GardenRepository class encapsulates all raw DB queries and has no knowledge of API types or business logic
- [ ] #2 GardenAssembler contains all row-to-API-type mapping (mapPlant, mapSchedule, mapJournalEntry, mapAttachment, index construction) as pure, exported functions
- [ ] #3 getGarden() orchestrator is reduced to repository instantiation, data loading, and a single assembleGarden() call — no inline queries or mapping logic
- [ ] #4 The Db type accepts both BetterSQLite3Database and PostgresJsDatabase so that PostgreSQL users do not encounter a type error
- [ ] #5 GardenAssembler functions are unit-testable without a database — tests pass raw row fixtures directly
- [ ] #6 All existing integration tests in garden.service.test.ts pass without modification
- [ ] #7 No change to the public getGarden() signature or the Garden response shape seen by routes and frontend
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extract GardenRepository: move all db.select() calls into a class or plain
   object with named loader methods; keep existing test coverage green
2. Export mapXxx helpers from a new garden.assembler.ts module
3. Extract assembleGarden(rows, window) as a pure function in garden.assembler.ts
4. Reduce getGarden() to the thin orchestrator calling repo + assembler
5. Fix the Db type: introduce a DrizzleDb union type in db/index.ts covering
   both BetterSQLite3Database and PostgresJsDatabase
6. Add unit tests for GardenAssembler using raw row fixtures (no DB required)
7. Verify all existing integration tests still pass
8. Update ADR-008 or add an inline comment confirming PostgreSQL type coverage
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
- [ ] #6 Implementation finished
- [ ] #7 Tests added (GardenAssembler unit tests with fixture rows)
- [ ] #8 No regressions introduced
- [ ] #9 getGarden() contains no inline db.select() calls
- [ ] #10 Db type compiles cleanly with both SQLite and PostgreSQL Drizzle generics
<!-- DOD:END -->
