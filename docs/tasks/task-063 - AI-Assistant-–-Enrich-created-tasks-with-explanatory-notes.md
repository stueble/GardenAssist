---
id: TASK-063
title: AI Assistant – Enrich created tasks with explanatory notes
status: Done
assignee:
  - '@agent'
created_date: '2026-05-09 23:44'
updated_date: '2026-05-10 01:19'
labels:
  - ai
  - frontend
dependencies: []
ordinal: 58000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Instruct the AI assistant to always add a short explanatory note to every task it creates, so users understand the reasoning behind each recommendation.

## Problem

The assistant creates tasks (e.g. 'Fertilize rose') without explaining why, leaving the user with no context about the importance, timing rationale, or whether simpler alternatives exist.

## Solution

Add an explicit instruction to the system prompt (Layer 1 or Layer 2) that requires the assistant to populate the task notes/info field with a brief explanation whenever it creates a task via tool call.

## Required note content

1. **Why** — short reason for the measure (e.g. 'Promotes strong bloom formation before the main flowering period')
2. **Priority** — is this important or optional? (e.g. 'Optional — skipping this once will not harm the plant')
3. **Alternative** — a simpler or less frequent option (e.g. 'A single slow-release fertilizer in spring is sufficient for low-maintenance gardens')

## Example

Task title: Fertilize rose (May)
Notes: 'Fertilizing before the main bloom supports strong flower development and healthy foliage. This is recommended but not critical — skipping one cycle will not harm the plant. As a simpler alternative, a single application of slow-release fertilizer in April is sufficient for most home gardens.'
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The system prompt instructs the assistant to always populate the info/notes field when creating a task via tool call
- [x] #2 The notes field includes: why the measure is recommended, whether it is important or optional, and at least one alternative or simplification
- [x] #3 The explanation is written in the user's language and adapted to the active gardener profile (e.g. shorter and simpler for Hobbyist)
- [x] #4 If the assistant creates multiple tasks in one response, each task gets its own individual explanation
- [x] #5 Existing tasks that are updated by the assistant are not retroactively modified unless the user explicitly asks
- [x] #6 Tests verify that the system prompt contains the instruction to populate the notes field
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Instruktion in DE + EN Tool-Beschreibung (Block 1) ergänzen
2. Tests für Prompt-Inhalt
3. Committen + In Review
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added NOTES REQUIRED instruction (DE + EN) to Block 1 of the system prompt. For every pruning/fertilization/misc add the model must populate notes with: why, priority (important/optional), and a simpler alternative. Depth adapts to gardener profile. No code changes outside the prompt. 6 new tests, 386/386 green.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
