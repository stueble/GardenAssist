---
id: TASK-056
title: AI Assistant – Prompt Caching (all Providers)
status: Ready
assignee: []
created_date: '2026-05-09 17:18'
updated_date: '2026-05-09 17:18'
labels:
  - ai
  - backend
dependencies: []
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
- [ ] #1 buildSystemPrompt() wird in 5 Segmente nach Stabilitätshierarchie aufgeteilt: Persona+Tools, Settings, Stammdaten, Dynamische Daten, Aktuelle Situation
- [ ] #2 Die Reihenfolge statisch→dynamisch stellt sicher dass OpenAIs implizites Prefix-Caching ohne weitere Konfiguration greift
- [ ] #3 Settings-Daten (Zonen, Kategorien, Farb-Presets) werden als eigener Block serialisiert (Block #2)
- [ ] #4 Pflanzenstammdaten und dynamische Pflanzendaten (Tasks, Journal, Schedules) werden als separate Blöcke serialisiert (Block #3 und #4)
- [ ] #5 Die aktuelle Situation (View + ausgewählte Pflanze) steht immer als letzter Block (Block #5)
- [ ] #6 Für anthropic und openrouter werden cache_control-Breakpoints auf Block #1–#4 gesetzt; openai erhält einen einzelnen String
- [ ] #7 Cache-Hits bei Anthropic verifizierbar via cache_read_input_tokens > 0 im Backend-Log
- [ ] #8 Alle bestehenden Tests bleiben grün, neue Tests für Block-Aufteilung und cache_control-Logik werden hinzugefügt
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
