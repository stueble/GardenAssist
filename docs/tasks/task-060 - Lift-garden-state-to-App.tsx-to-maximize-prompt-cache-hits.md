---
id: TASK-060
title: Lift garden state to App.tsx to maximize prompt cache hits
status: Done
assignee:
  - '@agent'
created_date: '2026-05-09 21:21'
updated_date: '2026-05-10 21:48'
labels:
  - ai
  - frontend
  - optimization
dependencies: []
ordinal: 60000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Currently each view loads its own garden state via getGarden() independently. This means Blocks 3+4 of the AI system prompt can differ between views even when the data is identical, reducing prompt cache hit rates.

Solution: Load garden state once in App.tsx (or a shared useGarden() hook) and pass it to all views. This ensures Blocks 3+4 are byte-identical across requests from different views.

Benefits:
- Higher Anthropic prompt cache hit rates
- Fewer getGarden() API calls (once per app session instead of once per view mount)
- Single source of truth for garden data

Note: Depends on TASK-059 (AiPanel lifted to App.tsx) being completed first.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Garden state is loaded once in App.tsx or a shared hook
- [x] #2 Views receive garden as a prop instead of fetching it themselves
- [x] #3 Prompt cache hit rate for Blocks 3+4 is maximized across view switches
- [x] #4 getGarden() is called once on app start and on explicit invalidation (e.g. after import)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. useGarden.ts Singleton-Hook (fetch, invalidate, getGardenSnapshot)
2. App.tsx: useGarden, Props an Views
3. DashboardView: Props-Interface, invalidateGarden
4. PlantsView: Props-Interface, plants aus garden ableiten
5. CalendarView: Props-Interface, plants aus garden ableiten
6. JournalView: Props-Interface, loadGarden → invalidateGarden
7. SettingsView: garden als Prop
8. Tests + Typecheck + Commit
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
useGarden singleton hook loads garden once in App.tsx. All 5 views receive garden/loading/invalidateGarden as props. usePlantEditDialog refactored to call invalidateGarden() instead of own getGarden(). Mutation callbacks (save, delete, task resolved, journal) all call invalidateGarden(). Fixed stale-garden-after-delete bug in PlantsView/CalendarView. 7 new hook tests, 397/397 green.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
