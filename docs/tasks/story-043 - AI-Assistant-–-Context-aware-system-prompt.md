---
id: STORY-043
title: AI Assistant – Context-aware system prompt
status: In Review
assignee:
  - '@agent'
created_date: '2026-05-07 22:18'
updated_date: '2026-05-07 22:47'
labels:
  - frontend
  - ai
dependencies:
  - STORY-042
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Equips the AiPanel with a structured, context-aware system prompt. Depends on story-042 (bare-bones chat) being complete.

## Context Architecture

Every request carries a three-layer system prompt:

1. Persona (static, hardcoded) — defines the assistant role, response language, and the local-first rule.
2. App Description (static, hardcoded per language) — explains all views and how tasks/schedules work.
3. Current Situation (dynamic, built per request) — active view name, selected plant (one identifying line only), full serialized garden.

## AssistantContext

Type: { view: "dashboard"|"plants"|"calendar"|"journal"|"settings", selectedPlant?: Plant, garden: Garden }. Passed from each view to AiPanel.

## Garden Serialization

Strip: created_at, updated_at, attachment URLs, thumbnail_attachment_id, position coordinates, icons/emoji. Include: all descriptive fields, schedules with label and notes, full journal history, open tasks.

## Language

Layers 1 and 2 hardcoded in German and English. Active language from i18n.language.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 AssistantContext type is defined and passed from each view to AiPanel: { view, selectedPlant?, garden }
- [x] #2 Every request includes the three-layer system prompt: persona, app description, current situation
- [x] #3 Garden serialization strips created_at, updated_at, attachment URLs, thumbnail_attachment_id, position coordinates, and icons
- [x] #4 When a plant is selected, only one identifying line is added to layer 3 (no duplication of data already in the garden list)
- [x] #5 System prompt layers 1 and 2 are available in German and English, driven by i18n.language
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
AssistantContext-Typ in docs/api/assistant-context.ts definiert (view, selectedPlant?, garden). Neues Modul apps/frontend/src/lib/aiPrompt.ts mit serializeGarden() (stripped: icon, positions, attachment-URLs, thumbnail_attachment_id, created_at, updated_at) und buildSystemPrompt() (3-Layer: Persona, App-Beschreibung, Situation — de/en). AiPanel erhält assistantContext-Prop; Prompt wird per Request an /api/ai/chat als system_prompt mitgeschickt und ersetzt den Stub. Backend-Route akzeptiert optionales system_prompt-Feld und bevorzugt es gegenüber dem Fallback. Alle Views (Dashboard, Plants, Calendar, Journal) leiten den AssistantContext weiter; Settings bleibt ohne Garden. 18 neue Tests für serializeGarden und buildSystemPrompt. 384 Tests gesamt grün.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
