---
id: TASK-103
title: Memoize systemBlocks in AiPanel to avoid redundant serialization on every send
status: Ready
assignee: []
created_date: '2026-05-19 21:06'
labels:
  - frontend
  - ai
  - performance
dependencies: []
priority: low
ordinal: 100000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
**Area:** Frontend / AI
**Date:** 2026-05-19

---

**As a** user on a low-powered mobile device
**I want** the garden serialization to run only when the garden data actually changes
**so that** CPU usage is minimised and message sending feels instant.

## Context

buildSystemBlocks() is called inside sendMessage() on every user message. For gardens with 50+ plants, schedules, and journal entries the serialization is non-trivial string work that runs unconditionally — even when nothing in the garden has changed between two consecutive messages.

Prompt caching (TASK-056) already eliminates the token-cost problem on the API side (blocks #1–#4 are cached). The remaining gap is purely on the client: the JS serialization itself still executes every time the send button is pressed.

## Technical Notes

- Wrap the buildSystemBlocks() call in useMemo with [assistantContext, lang] as dependencies
- The memo recomputes only when assistantContext reference changes (i.e. garden edited, view switched, plant selected) or language toggles — not on every keystroke or send
- assistantContext is already passed as a stable prop; no additional identity-stabilisation needed unless profiling shows otherwise
- No behaviour change: the blocks sent to the API remain identical
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 systemBlocks is derived via useMemo(…, [assistantContext, lang]) in AiPanel.tsx
- [ ] #2 buildSystemBlocks() is NOT called when neither assistantContext nor lang has changed between two sends
- [ ] #3 Behaviour is identical to before: the blocks passed to chatWithAi() are the same as without the memo
- [ ] #4 All existing AiPanel tests remain green
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
