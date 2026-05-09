---
id: TASK-042
title: AI Assistant – Bare-bones chat (send & receive)
status: Done
assignee:
  - '@agent'
created_date: '2026-05-07 22:18'
updated_date: '2026-05-07 22:39'
labels:
  - frontend
  - ai
dependencies: []
priority: high
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Wire up the AiPanel to the configured AI provider for basic multi-turn conversation. No system prompt beyond a minimal persona stub — the goal is to validate the provider integration end-to-end.

## What this story covers

Direct API calls from the frontend to the configured provider (OpenAI / Anthropic / OpenRouter) using the ai_api_key and ai_model stored in Settings. A simple one-line persona stub as the system message. Full conversation history sent with every request (multi-turn). Loading state while waiting for a response. Inline error message if the API call fails.

## Out of scope (covered by story-042)

AssistantContext type, per-view context passing, garden serialization, three-layer system prompt, bilingual prompt text.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Chat messages are sent to the configured AI provider (ai_provider + ai_api_key + ai_model from Settings) and the response is displayed in the panel
- [x] #2 A minimal persona stub is used as the system message
- [x] #3 Full conversation history is included in every request (multi-turn)
- [x] #4 While the assistant is responding, the input is disabled and a loading indicator is shown
- [x] #5 If the API call fails, an inline error message is shown in the chat
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Backend: neue Route apps/backend/src/routes/ai.ts (Provider-Logik für OpenAI/Anthropic/OpenRouter)
2. Backend: Zod-Schema in schemas/index.ts
3. Backend: Route in index.ts registrieren
4. Backend-Tests: apps/backend/src/routes/__tests__/ai.test.ts
5. Frontend: chatWithAi() in api/client.ts
6. Frontend: AiPanel.tsx — State, sendMessage(), UserMessage, Loading, Error, Auto-Scroll
7. Frontend-Tests: neue Describe-Blöcke in AiPanel.test.tsx
8. Typecheck + alle Tests grün
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Hono-Backend-Proxy POST /api/ai/chat leitet Chat-Nachrichten an OpenAI, Anthropic oder OpenRouter weiter. API-Key und Provider kommen aus den Settings (DB), nie aus dem Frontend-Request. AiPanel hat jetzt echten State (messages, loading, error), UserMessage- und LoadingDots-Komponenten, Auto-Scroll. Multi-turn History wird vollständig mitgesendet. 11 neue Backend-Tests (Provider-URLs, Header, History, Error-502), 8 neue Frontend-Tests (User-Bubble, Loading, Error-Banner, Multi-turn). Alle 366 Tests grün.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
