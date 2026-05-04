---
id: decision-001
title: ADR-001 - AI Provider Integration
date: '2026-05-02'
status: Accepted
---

## Context

The app requires an AI assistant for natural language interaction, plant identification,
and data entry support. Multiple AI providers exist (Anthropic, OpenAI, OpenRouter)
with different APIs, models, and pricing. Tying the app to a single provider would
limit user flexibility and create vendor lock-in.

## Decision

The AI integration is provider-agnostic. Users configure their own API key and select
their preferred provider in Settings → KI-Assistent. Supported providers:

- **Anthropic** – Claude models (e.g. claude-sonnet-4-6, claude-opus-4-6)
- **OpenAI** – GPT models (e.g. gpt-4o, gpt-4o-mini)
- **OpenRouter** – unified API for many models; user enters model ID manually

A "Test Connection" button in Settings validates the key before use.

## Consequences

- An AI abstraction layer must normalize requests and responses across providers.
- Provider-specific model lists must be maintained in the frontend.
- API keys are stored locally only and never transmitted to any app backend.
- Internet connectivity is required only when the user actively triggers an AI request.
