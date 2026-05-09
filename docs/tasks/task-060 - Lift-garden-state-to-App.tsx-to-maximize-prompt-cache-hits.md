---
id: TASK-060
title: Lift garden state to App.tsx to maximize prompt cache hits
status: Ready
assignee: []
created_date: '2026-05-09 21:21'
labels:
  - ai
  - frontend
  - optimization
dependencies: []
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
- [ ] #1 Garden state is loaded once in App.tsx or a shared hook
- [ ] #2 Views receive garden as a prop instead of fetching it themselves
- [ ] #3 Prompt cache hit rate for Blocks 3+4 is maximized across view switches
- [ ] #4 getGarden() is called once on app start and on explicit invalidation (e.g. after import)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
