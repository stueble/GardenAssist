---
id: TASK-100
title: >-
  Refactor: Extract createStore factory to replace duplicated singleton pub/sub
  pattern
status: Ready
assignee: []
created_date: '2026-05-19 20:34'
labels:
  - frontend
  - refactoring
  - tech-debt
dependencies: []
priority: medium
ordinal: 97000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

The frontend codebase contains at least 5 independent implementations of the
same hand-rolled singleton pub/sub pattern, each spread across its own hook file:

| File | State | Pattern |
|---|---|---|
| useGarden.ts | _state, _fetchPromise | setState() + _listeners.forEach() |
| useAiPanelState.ts | _open | setGlobalOpen() + _listeners.forEach() |
| useAssistantSettings.ts | _settings, _fetching | applySettings() + _listeners.forEach() |
| usePlantEditContext.ts | _handler | registerPlantEditHandler() |
| DashboardView.tsx | _weatherState, _soilState | two separate listener sets |

Every instance reimplements the same three primitives:
1. A module-level variable holding the current value
2. A Set<(s: T) => void> of React setState callbacks
3. A notify function that iterates the set and calls each listener

## Why this matters

- **Maintenance overhead**: A bug in the pattern (e.g. stale listener, race
  condition on concurrent fetches) must be fixed in 5 places independently.
- **Memory leak risk**: Each hook's useEffect must manually add/remove from its
  own listener set. A missing cleanup (or wrong dependency array) silently leaks
  memory — and this is invisible in tests.
- **Test boilerplate**: Every singleton needs its own _reset*ForTest() export.
  These are easy to forget and have caused test pollution in the past.
- **Onboarding friction**: New contributors encounter the same 30-line boilerplate
  pattern 5 times and have to understand it from scratch each time.

## Proposed solution

Extract a generic createStore<T>(initialState) factory:

  function createStore<T>(initial: T) {
    let state = initial;
    const listeners = new Set<(s: T) => void>();
    const setState = (next: T) => { state = next; listeners.forEach(l => l(next)); };
    const getState = () => state;
    const useStore = () => { ... }; // React hook with subscribe/cleanup
    const reset = (s = initial) => setState(s); // for tests
    return { setState, getState, useStore, reset };
  }

Alternatively, adopt **Zustand** (npm: zustand) which is exactly this pattern,
zero external dependencies, TypeScript-first, and already used by projects with
identical requirements. Each hook then collapses to:

  const useGardenStore = create<GardenState>(() => ({ garden: null, loading: true }));

## Affected files

- apps/frontend/src/hooks/useGarden.ts
- apps/frontend/src/hooks/useAiPanelState.ts
- apps/frontend/src/hooks/useAssistantSettings.ts
- apps/frontend/src/hooks/usePlantEditContext.ts
- apps/frontend/src/views/DashboardView.tsx (weather + soil state)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A generic createStore<T>() utility or Zustand replaces all module-level singleton implementations
- [ ] #2 All five locations are migrated: useGarden, useAiPanelState, useAssistantSettings, usePlantEditContext, weather/soil in DashboardView
- [ ] #3 Test reset helpers (_resetGardenForTest, resetAiPanelState, resetAssistantSettings) remain functional or are replaced by store.reset()
- [ ] #4 No behaviour change — all existing tests pass without modification after migration
- [ ] #5 Memory leak risk from missing listener cleanup is eliminated by the shared abstraction
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Decision: createStore<T>() in-house vs. Zustand (recommendation: Zustand)
2. If Zustand: pnpm add zustand in apps/frontend
3. Migrate useGarden.ts first as the most complex store (has async fetch + invalidate)
4. Migrate useAiPanelState.ts (simplest — single boolean)
5. Migrate useAssistantSettings.ts (has invalidate + reset pattern)
6. Migrate usePlantEditContext.ts (handler ref pattern, slightly different shape)
7. Migrate DashboardView.tsx weather + soil (extract into dedicated hook files)
8. Remove all _reset*ForTest exports; replace with store.reset() or zustand's setState
9. Update all import sites
10. Full test run — no changes to test logic expected
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
- [ ] #6 Implementation finished
- [ ] #7 Tests added or updated
- [ ] #8 No regressions introduced
- [ ] #9 All five singleton instances removed
<!-- DOD:END -->
