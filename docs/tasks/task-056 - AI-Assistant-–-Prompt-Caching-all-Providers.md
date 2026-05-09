---
id: TASK-056
title: AI Assistant – Prompt Caching (all Providers)
status: Done
assignee:
  - '@agent'
created_date: '2026-05-09 17:18'
updated_date: '2026-05-09 21:13'
labels:
  - ai
  - backend
dependencies: []
ordinal: 54000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Optimize the AI system prompt to reduce token costs across all providers.

## Problem

The system prompt is currently built as a single string on every request. Any change to the active view or selected plant invalidates the entire prompt prefix — breaking both OpenAI implicit caching and preventing Anthropic caching entirely.

## Solution

Split the system prompt into 5 blocks ordered by change frequency (static first, dynamic last). This immediately benefits OpenAI via automatic prefix caching. For Anthropic and OpenRouter, explicit cache_control breakpoints are added on top.

## Cache Block Strategy

| Block | Content | Changes when | cache_control |
|---|---|---|---|
| #1 | Persona + App description + Tools | Never | Anthropic/OpenRouter |
| #2 | Settings (zones, categories, colors) | Settings saved | Anthropic/OpenRouter |
| #3 | Plant base data (name, type, location) | Plant edited | Anthropic/OpenRouter |
| #4 | Dynamic plant data (tasks, journal, schedules) | Task resolved / journal entry added | Anthropic/OpenRouter |
| #5 | Current situation (active view + selected plant) | View or plant changes | none |

## Provider Behaviour

- openai: benefits from stable prefix via implicit caching — no code change needed beyond correct ordering
- anthropic: explicit cache_control on blocks #1–#4; cache reads cost 10% of normal input price
- openrouter: same as anthropic; OpenRouter forwards or ignores cache_control depending on routed model
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 buildSystemPrompt() wird in 5 Segmente nach Stabilitätshierarchie aufgeteilt: Persona+Tools, Settings, Stammdaten, Dynamische Daten, Aktuelle Situation
- [x] #2 Die Reihenfolge statisch→dynamisch stellt sicher dass OpenAIs implizites Prefix-Caching ohne weitere Konfiguration greift
- [x] #3 Settings-Daten (Zonen, Kategorien, Farb-Presets) werden als eigener Block serialisiert (Block #2)
- [x] #4 Pflanzenstammdaten und dynamische Pflanzendaten (Tasks, Journal, Schedules) werden als separate Blöcke serialisiert (Block #3 und #4)
- [x] #5 Die aktuelle Situation (View + ausgewählte Pflanze) steht immer als letzter Block (Block #5)
- [x] #6 Für anthropic und openrouter werden cache_control-Breakpoints auf Block #1–#4 gesetzt; openai erhält einen einzelnen String
- [x] #7 Cache-Hits bei Anthropic verifizierbar via cache_read_input_tokens > 0 im Backend-Log
- [x] #8 Alle bestehenden Tests bleiben grün, neue Tests für Block-Aufteilung und cache_control-Logik werden hinzugefügt
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. aiPrompt.ts: buildSystemPrompt() in 5 Blöcke aufteilen, Settings serialisieren, Stammdaten/Dynamik trennen
2. api/client.ts: chatWithAi() Signatur erweitern für strukturierten System Prompt
3. backend ai.ts: cache_control Breakpoints für Anthropic/OpenRouter; OpenAI bleibt Single-String
4. Backend loggt cache_read_input_tokens
5. Tests anpassen und neue Tests für Block-Aufteilung + cache_control
6. Typecheck + Tests grün
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented 5-block prompt caching. AssistantSettings type added to AssistantContext (location, zones, categories, color_presets — no API keys). buildSystemBlocks() splits prompt into: Block1=Persona+Tools (static), Block2=Settings, Block3=Plant base data, Block4=Dynamic data (tasks/journal/schedules), Block5=Current situation. Backend: Anthropic/OpenRouter receive structured array with cache_control ephemeral on blocks 1-4; OpenAI receives joined string. anthropic-beta: prompt-caching-2024-07-31 header added. Usage logged via console.log. useAssistantSettings hook feeds settings into all 4 views. 13 new/updated tests, 348+116 pass.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
