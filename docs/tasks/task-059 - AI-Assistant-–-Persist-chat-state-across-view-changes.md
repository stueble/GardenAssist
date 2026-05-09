---
id: TASK-059
title: AI Assistant – Persist chat state across view changes
status: In Progress
assignee:
  - '@agent'
created_date: '2026-05-09 18:24'
updated_date: '2026-05-09 21:21'
labels:
  - ai
  - frontend
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Persist the AI chat history and panel state across view navigation.

## Problem

AiPanel is currently mounted inside each individual view component. When the user navigates to a different view, the old view unmounts and a fresh AiPanel with empty messages is mounted. The entire conversation is lost on every navigation.

## Solution

Move AiPanel out of the individual views and render it once in App.tsx, at the same level as the router outlet. Since AiPanel never unmounts, its messages state is preserved across navigation.

AssistantContext (view, selectedPlant, garden) must be lifted up: each view passes its context to a shared state in App.tsx, which forwards it to the single AiPanel instance.

## Relation to context marker task

Once this task is done, the context marker task (view change marker in chat history) becomes straightforward: a useEffect in AiPanel watches the view field of AssistantContext and injects a separator message when it changes — the same mechanism already planned for plant changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 AiPanel is rendered once in App.tsx outside the route views, not inside individual view components
- [ ] #2 The messages state, open/closed state, and input state persist when navigating between views
- [ ] #3 AssistantContext (view, selectedPlant, garden) is passed from the active view up to App.tsx and forwarded to AiPanel
- [ ] #4 Each view no longer renders its own AiPanel instance
- [ ] #5 All existing AiPanel tests continue to pass
- [ ] #6 Tests verify that messages are retained after a simulated view change
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
