---
id: TASK-101
title: >-
  Refactor: Replace full garden reload after mutations with targeted state
  updates
status: Ready
assignee: []
created_date: '2026-05-19 20:36'
labels:
  - frontend
  - performance
  - tech-debt
dependencies: []
priority: medium
ordinal: 98000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

After every successful mutation the frontend discards the response payload and
triggers a full reload of the entire garden object via invalidateGarden():

  await apiClient.updatePlant(id, data);
  invalidateGarden();           // re-fetches ALL plants, schedules,
                                // journal entries, attachments, tasks

This pattern appears after every write operation across the codebase:
- Plant save / create / delete
- Journal entry create / update / delete
- Attachment upload / delete
- Garden plan upload / delete
- Settings save (triggers assistant settings reload)

## Why this matters

Every mutation endpoint already returns the updated entity as confirmation:

  PUT  /api/plants/:id      → Plant      (full updated plant object)
  POST /api/plants          → Plant
  POST /api/journal         → JournalEntry
  PUT  /api/journal/:id     → JournalEntry
  POST /api/attachments     → Attachment
  PATCH /api/garden         → Garden

This return value is silently discarded at every call site. Instead of using
it to patch only the affected slice of state, the entire garden (all plants,
all positions, all schedules, all journal entries, all attachments, all derived
tasks) is re-fetched from the server on every single save — including typing
a one-character change in a plant description.

**Current request cost per mutation:**
  1 write request  (e.g. PUT /api/plants/:id)
  1 full read      (GET /api/garden — returns the entire object graph)

**Target cost per mutation:**
  1 write request  (response payload already contains the updated object)
  0 additional reads

## Concrete impact today

- GardenPlanWidget deliberately suppresses loading:true during invalidateGarden()
  to avoid losing zoom/pan state on every plant save — this is a documented
  workaround for the missing targeted update.
- Any network hiccup after a save causes the UI to show stale data until the
  next successful reload, even though the mutation itself succeeded.
- As the plant list grows, GET /api/garden becomes a progressively heavier
  payload for an operation that touched a single field.

## Proposed solution

Introduce a patchGarden(updater: (g: Garden) => Garden) function alongside the
existing invalidateGarden(). Mutation hooks use patchGarden with the response
payload, and invalidateGarden() is reserved for bulk operations (import, delete-all)
where a full reload is genuinely necessary.

Example — plant update:

  const updated = await apiClient.updatePlant(id, data);
  patchGarden(g => ({
    ...g,
    plants: g.plants.map(p => p.id === updated.id ? updated : p),
  }));

Example — journal entry create:

  const entry = await apiClient.createJournalEntry(data);
  patchGarden(g => ({
    ...g,
    journal_entries: [entry, ...g.journal_entries],
  }));

## Affected files

- apps/frontend/src/hooks/useGarden.ts  (add patchGarden export)
- apps/frontend/src/views/PlantsView.tsx / PlantDetailView / PlantEditDialog
- apps/frontend/src/views/JournalView.tsx
- apps/frontend/src/views/DashboardView.tsx (attachment, plan upload)
- Any other component that currently calls invalidateGarden() after a single-entity mutation
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 patchGarden(updater) is exported from useGarden.ts and applies an immutable update to the in-memory garden state without triggering a network request
- [ ] #2 All single-entity mutations (plant CRUD, journal CRUD, attachment upload/delete) use patchGarden with the response payload instead of invalidateGarden()
- [ ] #3 invalidateGarden() is retained and still used for bulk operations: JSON import, delete-all, and initial app load
- [ ] #4 GardenPlanWidget zoom/pan state is preserved across plant saves without any special workaround
- [ ] #5 No additional GET /api/garden request is issued after a single-entity mutation
- [ ] #6 All existing tests pass; new unit tests cover patchGarden with plant update, journal create, and attachment delete scenarios
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add patchGarden(updater: (g: Garden) => Garden) to useGarden.ts
2. Audit all invalidateGarden() call sites — classify as single-entity vs. bulk
3. Migrate plant create/update/delete call sites to patchGarden
4. Migrate journal entry create/update/delete call sites to patchGarden
5. Migrate attachment upload/delete call sites to patchGarden
6. Migrate garden plan upload/delete to patchGarden (response is Garden)
7. Retain invalidateGarden() for import and delete-all flows
8. Remove the comment in useGarden.ts that explains why loading:true is suppressed
   (the workaround becomes unnecessary)
9. Add unit tests for patchGarden
10. Verify no regression in GardenPlanWidget zoom/pan behaviour
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
- [ ] #6 Implementation finished
- [ ] #7 Tests added
- [ ] #8 No regressions introduced
- [ ] #9 invalidateGarden() call count after single-entity mutations is zero
<!-- DOD:END -->
