---
id: TASK-057
title: AI Assistant – Context change marker in chat history
status: Done
assignee:
  - '@agent'
created_date: '2026-05-09 17:35'
updated_date: '2026-05-09 18:14'
labels:
  - ai
  - frontend
dependencies: []
ordinal: 53000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix a context collision bug and improve chat history readability by injecting context markers directly into the conversation history.

## Problem

When the user switches the selected plant, the system prompt updates — but the conversation history still references the previous plant, including tool calls with the old plant ID. The model follows the conversation history over the system prompt, causing edits to be applied to the wrong plant.

## Solution

Inject a non-interactive context marker into the messages state when the panel opens and whenever the selected plant changes. The context pill at the top of the panel is removed since the history makes it redundant.

## Example

```
👤 Set water demand to high
🤖 Done, set Rose to High.
─── 🌿 Rhododendron (North bed) ───
👤 Do the same here
🤖 Done, set Rhododendron to High.
```

## Implementation

- useEffect watches assistantContext.selectedPlant and injects a marker on change and on first render
- Marker messages use a custom type (e.g. 'context') so they are excluded from API calls
- Marker styling: centered, muted separator line — visually distinct from chat bubbles
- context prop on AiPanel and its rendering are removed
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When the chat panel opens, the current context (plant or view) is injected as a marker message into the conversation history
- [x] #2 When the selected plant changes, a marker message is automatically injected into the conversation history
- [x] #3 The marker shows plant name and location, e.g. '🌿 Rhododendron (North bed)'
- [x] #4 The marker has its own visual style (centered separator line, not a chat bubble)
- [x] #5 The marker is not sent to the API as a user/assistant message
- [x] #6 The context pill at the top of the chat panel is removed
- [x] #7 The model can correctly identify the active plant from the markers in the conversation history
- [x] #8 Tests for the useEffect that watches selectedPlant changes and injects the marker message
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added context change markers to AiPanel. ChatMessage type extended with role:'context'. useEffect watches assistantContext.selectedPlant — injects marker on open and on plant change. ContextMarker component: centered separator line with muted text (not a chat bubble). context-role messages filtered before API call. context prop removed from AiPanel and all 5 calling views. 4 new tests (AC #1-#5 + #8 plant-switch). 335/335 pass.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
