---
id: decision-001
title: ADR-001 - AI Provider Integration
date: '2026-05-03 17:34'
status: Accepted
---
## Context
The app needs an AI assistant. Multiple providers exist (Anthropic, OpenAI, OpenRouter)
with different APIs and model offerings. Tying the app to a single provider would limit
user flexibility and create vendor lock-in.

## Decision
The implementation is provider-agnostic. Users configure their own API key and select
their preferred provider in Settings → KI-Assistent. Supported providers: Anthropic
(Claude), OpenAI (GPT), OpenRouter (unified API for many models).

## Consequences
- Provider-specific model lists must be maintained in the frontend.
- The AI abstraction layer must normalize requests/responses across providers.
- API keys are stored locally only and never transmitted to any backend.

