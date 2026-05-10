---
id: TASK-062
title: AI Assistant – Gardener profile setting for personalized advice
status: Done
assignee:
  - '@agent'
created_date: '2026-05-09 22:55'
updated_date: '2026-05-10 00:50'
labels:
  - ai
  - frontend
  - backend
dependencies: []
ordinal: 57000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow users to configure their gardener profile in Settings so the AI assistant calibrates the complexity and time requirements of its recommendations accordingly.

## Problem

The assistant currently gives professional-grade advice (e.g. fertilizing a rose three times a year) regardless of the user's actual available time and gardening ambition. For most home gardeners this is overwhelming and unrealistic.

## Solution

Add a Gardener Profile setting with three levels. The selected profile is injected into Layer 1 of the system prompt so the assistant adapts its tone, frequency of care recommendations, and overall ambition to match the user's reality.

## Profiles

| Profile | Weekly time | Prompt instruction |
|---|---|---|
| 🌱 Hobbyist | ~1h / week | Simple, low-effort routines. Avoid multi-step or frequent interventions. One fertilization per season at most. |
| 🌿 Engaged | 2–4h / week | Regular seasonal care. Moderate effort acceptable. Standard fertilization and pruning schedules. |
| 🌳 Expert | 5h+ / week | Optimal care routines. Professional-grade schedules, multiple fertilizations, detailed pruning windows. |

## System Prompt Integration

The profile is added as a single explicit sentence in Layer 1 (Persona), e.g.:

> The user is a hobbyist gardener with approximately 1 hour per week available for garden care. Keep all recommendations simple and time-efficient. Avoid professional-grade schedules or multi-step interventions.

## Settings UI

Single dropdown or segmented control in Settings → KI-Assistent, directly below the model/provider fields. Each option shows the label and the weekly time in a muted subtitle.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Settings page includes a new 'Gardener Profile' field with three options: Hobbyist, Engaged, Expert
- [x] #2 Each profile option displays its typical weekly time commitment: Hobbyist (~1h/week), Engaged (2-4h/week), Expert (5h+/week)
- [x] #3 The selected profile is persisted in the settings table alongside existing settings fields
- [x] #4 The profile value is included in AssistantContext and serialized into Layer 1 of the system prompt
- [x] #5 The system prompt describes both the experience level and the available time explicitly, e.g. 'The user is a hobbyist gardener with about 1 hour per week available. Recommend simple, low-effort routines and avoid professional-grade schedules.'
- [x] #6 If no profile is set, the prompt falls back to a neutral default (Engaged)
- [x] #7 The profile can be changed at any time in Settings and takes effect on the next chat message
- [x] #8 Tests cover prompt generation for all three profile levels
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. DB-Migration: gardener_profile Spalte zu settings-Tabelle hinzufügen
2. Backend: Schema + Route anpassen (GET/PUT settings)
3. AssistantSettings-Typ erweitern
4. Frontend Settings-UI: Dropdown in AiSection
5. aiPrompt.ts Block 1: Profil-Satz in Persona einbauen
6. i18n-Strings für DE + EN
7. Tests: Prompt-Generierung für alle 3 Profile
8. Typecheck + Tests grün, committen
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added gardener_profile (hobbyist/engaged/expert) to settings table (migration 0005), Zod schema, Settings API type, AssistantSettings, useAssistantSettings hook. AiSection gets a new dropdown with emoji labels and weekly time. Profile sentence injected at top of Block 2 so it is cached together with other settings. Null falls back to engaged. 6 new prompt tests. 120+378 tests green.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
